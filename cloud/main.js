
/* Initialize the Stripe Cloud Modules */
var Stripe = require('stripe');
Stripe.initialize('pk_test_6pRNASCoBOKtIshFeQd4XMUh'); //Test key

// var Mailgun = require('mailgun');
// Mailgun.initialize("sandbox70d17fc2c9044f9992e1c0f7ba66e147.mailgun.org", "key-75b094eb418172847bfd1ae838b2fe74");

// var _ = require('underscore');
// var fs = require('fs');

var path = require('path');
var randomstring = require(path.join(__dirname, 'library/randomString/randomString.js'));


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
Parse.Cloud.define("chargeOneTime", function(request, response) {
  // The Item and Order tables are completely locked down. We 
  // ensure only Cloud Code can get access by using the master key.
  Parse.Cloud.useMasterKey();

  // Top level variables used in the promise chain. Unlike callbacks,
  // each link in the chain of promise has a separate context.
  var item, order;

  // We start in the context of a promise to keep all the
  // asynchronous code consistent. This is not required.
  Parse.Promise.as().then(function(order) { 
    // Now we can charge the credit card using Stripe and the credit card token.
    return Stripe.Charges.create({
      amount: 20 * 100, // hardcoded $ 20 
      currency: 'usd',
      card: request.params.cardToken,
      description: "my description",
      metadata: {"some_id": "1232"}
    }).then(null, function(error) {
      console.log('Charging with stripe failed. Error: ' + error);
      return Parse.Promise.error('An error has occurred. Your credit card was not charged.');
    });

  }).then(function(purchase) {

  }).then(function(order) {


  }).then(function() {
    // And we're done!
    response.success('Success');

  // Any promise that throws an error will propagate to this handler.
  // We use it to return the error from our Cloud Function using the 
  // message we individually crafted based on the failure above.
  }, function(error) {
    response.error(error);
  });
});

/*
 * Setup a charging plan for an user using the Stripe
 * Cloud Module.
 *
 * Expected input (in request.params):
 *   reasonForTheCharge : String, can be "Mug, "Tshirt" or "Hoodie"
 *   cardToken      	: String, the credit card token returned to the client from Stripe

 *   chargeAmount		: int, charge amount in $
 *	 repeat				: enum? monthly, yearly.

 *   id           	: String, the buyer's id
 *   name           : String, the buyer's name
 *
 * Also, please note that on success, "Success" will be returned. 
 */

Parse.Cloud.define("createSubscriptionPlan", function(request, response) {
  // The Item and Order tables are completely locked down. We 
  // ensure only Cloud Code can get access by using the master key.
  Parse.Cloud.useMasterKey();

  // Top level variables used in the promise chain. Unlike callbacks,
  // each link in the chain of promise has a separate context.
  var item, order;

  // We start in the context of a promise to keep all the
  // asynchronous code consistent. This is not required.
  Parse.Promise.as().then(function(order) { 

  }).then(function(purchase) {

  }).then(function(order) {

  }).then(function() {
    // And we're done!
    response.success('Success');

  // Any promise that throws an error will propagate to this handler.
  // We use it to return the error from our Cloud Function using the 
  // message we individually crafted based on the failure above.
  }, function(error) {
    response.error(error);
  });
});

// Parse.Cloud.define("shareVivaEmail", function(request, response) {
  
//   var fullName = request.params.fullName;
//   var mailFrom = request.params.from;
//   var mailTo = request.params.to;
//   var subject = request.params.subject;

//   var template = fs.readFileSync('cloud/templates/shareJobVivaEmail_html.js','utf8');
//   var compiled = _.template(template);
//   var html = compiled(
//       {
//          // 'name': fullName
//       }
//   );

//   console.log("Read HTML OK OK OK");
//   // console.log(html);

//   Mailgun.sendEmail({
//       to: mailTo,
//       from: mailFrom,
//       subject: subject,
//       text: "Your email did not support html...",
//       html: html
//   }, {
//       success: function(httpResponse) {
//           console.log(httpResponse);
//           response.success("Email sent!");
//       },
//       error: function(httpResponse) {
//          console.error(httpResponse);
//          response.error("Uh Oh Something went wrong...");
//       }
//   });
// });

Parse.Cloud.define("resetPassword", function(request, response) {

  var generatedPassword = randomstring.generate(12);
  console.log("Generated Password: " + generatedPassword);

  var query = new Parse.Query(Parse.User);
  query.equalTo("email", request.params.email);
  query.first({
      success: function(user){
          if (user) {
              // Parse.Cloud.useMasterKey();

              response.success("We still waiting for email function, therefor password for user "+ user.get('username') +" will not be reset yet.");

              // user.setPassword(generatedPassword);

              // user.save(null,{
              // success: function(user){
              //     // The user was saved correctly
              //     response.success(1);
              // },
              // error: function(SMLogin, error){
              //     response.error("There are issue happen while changing your password, please try again later.");
              // }
          // });
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

Parse.Cloud.beforeSave(Parse.User, function(request, response) {

  var firstName = request.object.get("firstName");
  var lastName = request.object.get("lastName");

  request.object.set("firstName", firstName.toLowerCase());
  request.object.set("lastName", lastName.toLowerCase());

  request.object.set("fullName", firstName.toLowerCase() + " " + lastName.toLowerCase());

  response.success();
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

  query.each(function(listing) {
    var expireDate = listing.get("expirationDate");
    // console.log("expireDate: " + expireDate);
    // console.log("expireDate in milisecond: " + expireDate.gettime);
      if(expireDate.getTime() < dateCheckForExpiringInMilisecond){
        listing.set("status", "expiring");
        listing.save();
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

  query.each(function(listing) {
    var expireDate = listing.get("expirationDate");
      if(expireDate.getTime() < todayInMiliseconds){
        listing.set("status", "expired");
        listing.save();
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