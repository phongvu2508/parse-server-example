
// var moment = require('moment');

/* Initialize the Stripe Cloud Modules */

var stripe = require("stripe")(
  "sk_test_Os4QKRvjOi2g3tRuyXjBty3y"
); // Test key

var mandrill = require('mandrill-api/mandrill');
var mandrill_client = new mandrill.Mandrill('1wDDvAXrtGo50Kw8Wt1izw');

// var Mailgun = require('mailgun');
// Mailgun.initialize("sandbox70d17fc2c9044f9992e1c0f7ba66e147.mailgun.org", "key-75b094eb418172847bfd1ae838b2fe74");

var _ = require('underscore');
var fs = require('fs');

// var path = require('path');
// var randomstring = require(path.join(__dirname, 'library/randomString/randomString.js'));




// Use Parse.Cloud.define to define as many cloud functions as you want.
// For example:
Parse.Cloud.define("hello", function(request, response) {
  response.success("Hello from the Cloud!");
});

/*
 * Charge user for one time using the Stripe
 * Cloud Module.
 *
 * Expected input (in request.params):
 *   reasonForTheCharge : String, can be "Mug, "Tshirt" or "Hoodie"
 *   cardToken      	: String, the credit card token returned to the client from Stripe

 *   chargeAmount		: int, charge amount in $

 *   id           	: String, the buyer's id
 *   name           : String, the buyer's name
 *
 * Also, please note that on success, "Success" will be returned. 
 */
Parse.Cloud.define("chargeListing", function(request, response) {
  // Parse.Cloud.useMasterKey();

  console.log('Start to process charging.');

  var userQuery = new Parse.Query("User");
  userQuery.get(request.params.userID, {
      success: function(user) {
        var listingQuery = new Parse.Query("Listing");
        listingQuery.include("listingType")

        listingQuery.get(request.params.listingID, {
          success: function(listing) {
            var listingType = listing.get("listingType");
            var amountInCent = listingType.get('pricePerListing') * 100; //amount by cent.
            var duration = listingType.get('duration');
            var description = "Charge for posting a listing of user " + user.get('username');

            return stripe.charges.create({
              amount: amountInCent,
              currency: 'usd',
              source: request.params.cardToken,
              description: description,
              receipt_email: user.get('email'),
              metadata: {FindtouchUserId: request.params.userID,
                          FindtouchListingId: request.params.listingID}
            }, function(err, charge) {
              // asynchronously called
              if(charge){

                listing.set("status", "active");
                listing.set("paymentStatus", "paid");

                var expirationDate = new Date();
                expirationDate.setTime(expirationDate.getTime() + parseInt(duration) * 86400000);

                listing.set("expirationDate", expirationDate);

                console.log('Listing updating to status = active, paymentStatus = paid, expirationDate = ' + expirationDate);

                listing.save().then(function() {
                  console.log('Listing update successfully ' + listing.id);

                  // TODO: Notify user here.

                  response.success(charge);
                }, function(error) {
                  // worst situation, credit card was charged, but we cannot save the listing update. 
                    console.log('Credit card was charged, listing update fail ' + listing.id);
                    response.error(error);
                });
              }else
              {
                console.log('Charging with stripe failed. Error: ' + err);
                response.error(err);
              }
            });
            
          },
          error: function(object, error) {
            console.log('Fail to get listing ' + request.params.listingID);
            response.error(error);
          }
        });      
      },
      error: function(object, error) {
        console.log('Fail to get user ' + request.params.userID);
        response.error(error);
      }
    });

});

Parse.Cloud.define("resetPassword", function(request, response) {
  var randomstring = require('randomstring');
  var generatedPassword = randomstring.generate(12);
  console.log("Generated Password: " + generatedPassword);

  var query = new Parse.Query(Parse.User);
  query.equalTo("email", request.params.email);
  query.first({
      success: function(user){
          if (user) {
              Parse.Cloud.useMasterKey();

              response.success("We still waiting for email function, therefor password for user "+ user.get('username') +" will not be reset yet.");

              user.setPassword(generatedPassword);

              user.save(null,{
                  success: function(user){
                      var userFullName = user.get("firstname") + " " + user.get("lastname");
                      var template_name = "PasswordResetMail";
                      var template_content = [{
                              "name": "example name",
                              "content": "example content"
                          }];

                      var message = {
                          "subject": "Your password on Findtouch.com has been reset",
                          "from_email": "support@findtouch.com",
                          "from_name": "Example Name",
                          "to": [{
                                  "email": request.params.email,
                                  "name": userFullName,
                                  "type": "to"
                              }],
                          "headers": {
                              "Reply-To": "support@findtouch.com"
                          },

                          "merge": true,
                          "merge_language": "mailchimp",
                          "global_merge_vars": [{
                                  "name": "name",
                                  "content": userFullName
                                },
                                {
                                  "name": "password",
                                  "content": generatedPassword
                                }],

                          "tags": [
                              "password-resets"
                          ]
                      };

                      var async = false;
                      var ip_pool = "Main Pool";
                      var send_at = "example send_at";
                      mandrill_client.messages.sendTemplate({"template_name": template_name, "template_content": template_content, "message": message, "async": async, "ip_pool": ip_pool, "send_at": send_at
                      }, function(result) {
                          console.log(result);
                          response.success(result);
                          /*
                          [{
                                  "email": "recipient.email@example.com",
                                  "status": "sent",
                                  "reject_reason": "hard-bounce",
                                  "_id": "abc123abc123abc123abc123abc123"
                          }]
                          */
                      }, function(e) {
                          // Mandrill returns the error as an object with name and message keys
                          console.log('A mandrill error occurred: ' + e.name + ' - ' + e.message);
                          response.error('A mandrill error occurred: ' + e.name + ' - ' + e.message);
                          // A mandrill error occurred: Unknown_Subaccount - No subaccount exists with the id 'customer-123'
                      });
                  },
                  error: function(SMLogin, error){
                      response.error("There are issue happen while changing your password, please try again later.");
                  }
              });
          };
      },
      error: function(){
          response.error("This email is not registed.");
      }
  });

  // var template = fs.readFileSync('cloud/templates/shareJobVivaEmail_html.js','utf8');
  // var compiled = _.template(template);
  // var html = compiled(
  //     {
  //        // 'name': fullName
  //     }
  // );

  // console.log("Read HTML OK OK OK");
  // console.log(html);

  // Mailgun.sendEmail({
  //     to: request.params.email,
  //     from: mailFrom,
  //     subject: "Your password has been reset.",
  //     text: "Your email did not support html...",
  //     html: html
  // }, {
  //     success: function(httpResponse) {
  //         console.log(httpResponse);
  //         response.success("Email sent!");
  //     },
  //     error: function(httpResponse) {
  //        console.error(httpResponse);
  //        response.error("Uh Oh Something went wrong...");
  //     }
  // });
});

Parse.Cloud.define("searchListing", function(request, response) {
  
  var keywords = request.params.keywords;
  var city = request.params.city;

  var titleQuery = new Parse.Query("Listing");
  titleQuery.contains("tittleInLowerCase", keywords);

  if(city != ""){
    titleQuery.contains("city", city);
  }

  titleQuery.include("company");
  titleQuery.include("listingType");
  titleQuery.find({
    success: function(results) {

      var listings = [];

      for (var i = 0; i < results.length; ++i) {
        listings.push(results[i]);
      }

      response.success(listings);

    },
    error: function() {
      response.error("listing lookup failed");
    }
  });
});

Parse.Cloud.define("searchWorker", function(request, response) {
  
  var keywords = request.params.keywords;
  var city = request.params.city;

  var nameQuery = new Parse.Query("User");
  nameQuery.contains("fullName", keywords);

  if(city != ""){
    nameQuery.contains("city", city);
  }

  nameQuery.find({
    success: function(results) {

      var workers = [];

      for (var i = 0; i < results.length; ++i) {
        workers.push(results[i]);
      }

      response.success(workers);

    },
    error: function() {
      response.error("listing lookup failed");
    }
  });
});

Parse.Cloud.define("searchWorkerWithFilters", function(request, response) {
  var keywords = request.params.keywords;
  var city = request.params.city;
  var skills = request.params.skills;

  console.log("keywords: " + keywords);
  console.log("city: " + city);
  console.log("skills: " + skills);

  var nameQuery = new Parse.Query("User");
  nameQuery.contains("fullName", keywords);

  if(city != ""){
    nameQuery.contains("city", city);
  }

  var profileQuery = new Parse.Query("UserProfile");
  profileQuery.containsAll("skills", skills);
  // profileQuery.matchesQuery("user", nameQuery);
  profileQuery.include("user");

  profileQuery.find({
    success: function(results) {

      console.log("Found " + results.length + " result(s)");

      var workers = [];

      for (var i = 0; i < results.length; ++i) {
        workers.push(results[i].get("user"));
      }

      response.success(workers);
    },
    error: function() {
      response.error("listing lookup failed");
    }
  });
});

Parse.Cloud.beforeSave(Parse.User, function(request, response) {

  var firstName = request.object.get("firstName").toLowerCase();
  var lastName = request.object.get("lastName").toLowerCase();

  request.object.set("firstName", firstName);
  request.object.set("lastName", lastName);

  request.object.set("fullName", firstName + " " + lastName);

  if(request.object.get("activated") === false &&
    request.object.get("admin") === false){
      var user = request.object;
      var userFullName = user.get("firstname") + " " + user.get("lastname");
      var template_name = "UserActivateMail";
      var template_content = [{
              "name": "example name",
              "content": "example content"
          }];

      var message = {
          "subject": "Your personal account has been created on Findtouch.com",
          "from_email": "support@findtouch.com",
          "from_name": "Example Name",
          "to": [{
                  "email": user.get("email"),
                  "name": userFullName,
                  "type": "to"
              }],
          "headers": {
              "Reply-To": "support@findtouch.com"
          },

          "merge": true,
          "merge_language": "mailchimp",
          "global_merge_vars": [{
                  "name": "name",
                  "content": userFullName
                },
                {
                  "name": "email",
                  "content": user.get("email")
                }],

          "tags": [
              "user-create"
          ]
      };

      var async = false;
      var ip_pool = "Main Pool";
      var send_at = "example send_at";
      mandrill_client.messages.sendTemplate({"template_name": template_name, "template_content": template_content, "message": message, "async": async, "ip_pool": ip_pool, "send_at": send_at
      }, function(result) {
          console.log(result);
          request.object.set("activated", true);
          response.success();
      }, function(e) {
          // Mandrill returns the error as an object with name and message keys
          console.log('A mandrill error occurred: ' + e.name + ' - ' + e.message);
      });
  }
});

Parse.Cloud.beforeSave("Listing", function(request, response) {

  var title = request.object.get("title");
  var address = request.object.get("address");
  var city = request.object.get("city");
  var state = request.object.get("state");

  request.object.set("tittleInLowerCase", title.toLowerCase());

  request.object.set("address", address.toLowerCase());
  request.object.set("city", city.toLowerCase());
  request.object.set("state", state.toLowerCase());

  response.success();
});

Parse.Cloud.beforeSave("Company", function(request, response) {

  var name = request.object.get("name");
  var address = request.object.get("address");
  var city = request.object.get("city");
  var state = request.object.get("state");

  request.object.set("nameInLowerCase", name.toLowerCase());

  request.object.set("address", address.toLowerCase());
  request.object.set("city", city.toLowerCase());
  request.object.set("state", state.toLowerCase());

  response.success();
});

Parse.Cloud.define("listingExpiringCheck", function(request, status) {

  // var daysCheckForExpiring = 7;
  var daysCheckForExpiring = request.params.daysCheckForExpiring;

  var today = new Date();
  // console.log("today: " + today);
  var dateCheckForExpiringInMilisecond = today.getTime() + daysCheckForExpiring * 86400000;
  // console.log("dateCheckForExpiringInMilisecond: " + dateCheckForExpiringInMilisecond);
  var query = new Parse.Query("Listing");
  query.contains("status", "active");
  query.include("User");

  query.each(function(listing) {
    var expireDate = listing.get("expirationDate");
    // console.log("expireDate: " + expireDate);
    // console.log("expireDate in milisecond: " + expireDate.gettime);
      if(expireDate.getTime() < dateCheckForExpiringInMilisecond){
        listing.set("status", "expiring");
        listing.save();

        var listingTitle = listing.get("title");
        var user = listing.get("user");
        var userFullName = user.get("firstname") + " " + user.get("lastname");
        var template_name = "ListingExpiringMail";
        var template_content = [{
                "name": "example name",
                "content": "example content"
            }];

        var message = {
            "subject": "Your listing on Findtouch.com is expiring",
            "from_email": "support@findtouch.com",
            "from_name": "Example Name",
            "to": [{
                    "email": user.get("email"),
                    "name": userFullName,
                    "type": "to"
                }],
            "headers": {
                "Reply-To": "support@findtouch.com"
            },

            "merge": true,
            "merge_language": "mailchimp",
            "global_merge_vars": [{
                    "name": "name",
                    "content": userFullName
                  },
                  {
                    "name": "listing",
                    "content": listingTitle
                  }],

            "tags": [
                "listing-expiring"
            ]
        };

        var async = false;
        var ip_pool = "Main Pool";
        var send_at = "example send_at";
        mandrill_client.messages.sendTemplate({"template_name": template_name, "template_content": template_content, "message": message, "async": async, "ip_pool": ip_pool, "send_at": send_at
        }, function(result) {
            console.log(result);
        }, function(e) {
            // Mandrill returns the error as an object with name and message keys
            console.log('A mandrill error occurred: ' + e.name + ' - ' + e.message);
        });
      }
  }).then(function() {
    // Set the job's success status
    status.success("Job completed successfully.");
  }, function(error) {
    // Set the job's error status
    status.error("Uh oh, something went wrong.");
  });

});

Parse.Cloud.define("listingExpiredCheck", function(request, status) {
  var today = new Date();
  var todayInMiliseconds = today.getTime();
  var query = new Parse.Query("Listing");
  query.containedIn("status", ["expiring", "inactive"]);
  query.include("User");

  query.each(function(listing) {
    var expireDate = listing.get("expirationDate");
      if(expireDate.getTime() < todayInMiliseconds){
        listing.set("status", "expired");
        listing.save();

        var listingTitle = listing.get("title");
        var user = listing.get("user");
        var userFullName = user.get("firstname") + " " + user.get("lastname");
        var template_name = "ListingExpiredMail";
        var template_content = [{
                "name": "example name",
                "content": "example content"
            }];

        var message = {
            "subject": "Your listing on Findtouch.com has been expired",
            "from_email": "support@findtouch.com",
            "from_name": "Example Name",
            "to": [{
                    "email": user.get("email"),
                    "name": userFullName,
                    "type": "to"
                }],
            "headers": {
                "Reply-To": "support@findtouch.com"
            },

            "merge": true,
            "merge_language": "mailchimp",
            "global_merge_vars": [{
                    "name": "name",
                    "content": userFullName
                  },
                  {
                    "name": "listing",
                    "content": listingTitle
                  }],

            "tags": [
                "listing-expired"
            ]
        };

        var async = false;
        var ip_pool = "Main Pool";
        var send_at = "example send_at";
        mandrill_client.messages.sendTemplate({"template_name": template_name, "template_content": template_content, "message": message, "async": async, "ip_pool": ip_pool, "send_at": send_at
        }, function(result) {
            console.log(result);
        }, function(e) {
            // Mandrill returns the error as an object with name and message keys
            console.log('A mandrill error occurred: ' + e.name + ' - ' + e.message);
        });
      }
  }).then(function() {
    // Set the job's success status
    status.success("Job completed successfully.");
  }, function(error) {
    // Set the job's error status
    status.error("Uh oh, something went wrong.");
  });

});

Parse.Cloud.define("listingExpiredCleanup", function(request, status) {

  var daysCheckForExpired = request.params.daysCheckForExpired;

  var today = new Date();
  var todayInMiliseconds = today.getTime() - daysCheckForExpired * 86400000;
  var query = new Parse.Query("Listing");
  query.contains("status", "expired");

  query.each(function(listing) {
    var daysCheckForExpiredInMilisecond = listing.get("expirationDate").getTime();
    if(daysCheckForExpiredInMilisecond < todayInMiliseconds){
      listing.destroy();
    }
  }).then(function() {
    // Set the job's success status
    status.success("Job completed successfully.");
  }, function(error) {
    // Set the job's error status
    status.error("Uh oh, something went wrong.");
  });

});