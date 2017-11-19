// 1. Text strings =====================================================================================================
//    Modify these strings and messages to change the behavior of your Lambda function

const languageStrings = {
    'en': {
        'translation': {
            'WELCOME': "Hi! Welcome to teacher.",
            'TITLE': "GraspIO Teacher",
            'HELP': "I have three modes to start. Play, learn and teach. Kindly select one mode.",
            'STOP': "Okay, see you next time! "
        }
    }
    // , 'de-DE': { 'translation' : { 'WELCOME'   : "Guten Tag etc." } }
};

const welcomeCardImg = {
    smallImageUrl: 'https://s3.amazonaws.com/webappvui/img/breakfast_sandwich_small.png',
    largeImageUrl: 'https://s3.amazonaws.com/webappvui/img/breakfast_sandwich_large.png'
};
// 2. Skill Code =======================================================================================================

const Alexa = require('alexa-sdk');
const request = require('request');
const AWS = require('aws-sdk'); // this is defined to enable a DynamoDB connection from local testing
const AWSregion = 'eu-west-1'; // eu-west-1
var persistenceEnabled;
AWS.config.update({
    region: AWSregion
});

exports.handler = function (event, context, callback) {
    var alexa = Alexa.handler(event, context);
    //alexa.appId = 'amzn1.echo-sdk-ams.app.1234';
    alexa.dynamoDBTableName = 'RecipeSkillTable'; // creates new table for session.attributes
    if (alexa.dynamoDBTableName == 'RecipeSkillTable') {
        persistenceEnabled = true;
    } else {
        persistenceEnabled = false;
    }
    alexa.resources = languageStrings;
    alexa.registerHandlers(handlers);
    alexa.execute();

};

const handlers = {
    'LaunchRequest': function () {
        if (!this.attributes['currentStep']) {
            var say = this.t('WELCOME') + ' ' + this.t('HELP');
            this.response.cardRenderer(this.t('TITLE'), this.t('WELCOME'), welcomeCardImg);
        } else {

            var say = 'Welcome back.  You were on ' +
                this.attributes['currentStep'] +
                ' mode. Do you want to continue?';

            this.response.cardRenderer('Continue?', "\n" + say);
        }
        this.response.speak(say).listen(say);
        this.emit(':responseReady');
    },

    'ModeIntent': function () {
        var mode = this.event.request.intent.slots.mode.value;
        console.log("Request: ", this.event);
        if (mode === 'play' || mode === 'learn') {
            this.attributes['currentStep'] = mode;
            var say = "You are in " + mode + " mode now. You can give me the direction";
            var postData = {
                payload: mode
            };
            var self = this;
            request({
                url: 'https://graspio-alexa-app.herokuapp.com/send-data',
                method: 'POST',
                json: postData
            }, function (error, response, body) {
                self.response.speak(say).listen(say);
                self.emit(':responseReady');
            });
        } else if (mode === 'teach') {
            this.attributes['currentStep'] = "teach";
            var say = "You are in teach mode now. Let me solve the map.";
            var postData = {
                payload: mode
            };
            var self = this;
            request({
                url: 'https://graspio-alexa-app.herokuapp.com/send-data',
                method: 'POST',
                json: postData
            }, function (error, response, body) {
                self.response.speak(say)
                self.emit(':responseReady');
            });
        } else {
            var say = "Sorry! That mode is not available.";
            this.response.speak(say).listen(say);
            this.emit(':responseReady');
        }
    },

    'DirectionIntent': function () {
        var direction = this.event.request.intent.slots.direction.value;
        if (this.attributes['currentStep'] === "play") {
            if (direction === "straight" || direction === "forward" || direction === "front") {
                var say = "moving " + direction;
            } else if (direction === "back" || direction === "backward") {
                var say = "moving " + direction;
            } else if (direction === "left") {
                var say = "turning " + direction;
            } else if (direction === "right") {
                var say = "turning " + direction;
            } else {
                var say = "I can't move in that direction. Sorry!"
            }
            var postData = {
                payload: direction
            };
            var self = this;
            request({
                url: 'https://graspio-alexa-app.herokuapp.com/send-data',
                method: 'POST',
                json: postData
            }, function (error, response, body) {
                self.response.speak(say).listen(say);
                self.emit(':responseReady');
            });
        } else if(this.attributes['currentStep'] === "learn") {
            var postData = {
                payload: direction
            };
            var self = this;
            request({
                url: 'https://graspio-alexa-app.herokuapp.com/send-data',
                method: 'POST',
                json: postData
            }, function (error, response, body) {
                var say = " ";
                self.response.speak(say).listen(say);
                self.emit(':responseReady');
            });
        }
    },

    'AMAZON.YesIntent': function () {
        if (this.attributes['currentStep'] === "play") {
            var say = "You can give me the directions now";
            this.response.speak(say).listen(say);
            this.emit(':responseReady');
        } else if (this.attributes['currentStep'] === "teach") {
            this.attributes['currentStep'] = "teach";
            var say = "You are in teach mode now. Let me solve the map.";
            var postData = {
                payload: "teach"
            };
            var self = this;
            request({
                url: 'https://graspio-alexa-app.herokuapp.com/send-data',
                method: 'POST',
                json: postData
            }, function (error, response, body) {
                self.response.speak(say)
                self.emit(':responseReady');
            });
        }
    },
    'AMAZON.NoIntent': function () {
        delete this.attributes['currentStep'];
        this.emit('LaunchRequest');
    },
    'AMAZON.PauseIntent': function () {

        var say = "If you pause, you'll lose your progress. Do you want to go to the next step?";
        var reprompt = "Do you want to go to the next step?";

        // cross-session persistence is enabled
        if (persistenceEnabled) {
            say = 'Okay, you can come back to this skill to pick up where you left off.';
        }
        this.response.speak(say);
        this.emit(':responseReady');
    },

    'AMAZON.HelpIntent': function () {
        if (!this.attributes['currentStep']) { // new session
            this.response.speak(this.t('HELP')).listen(this.t('HELP'));
        } else {
            var currentStep = this.attributes['currentStep'];
            var say = 'you are on step ' + currentStep + ' of the ' + this.t('TITLE') + ' recipe. ';
            var reprompt = 'Say Next to continue or Ingredients to hear the list of ingredients.';
            this.response.speak(say + reprompt).listen(reprompt);
        }
        this.emit(':responseReady');
    },

    'AMAZON.StartOverIntent': function () {
        delete this.attributes['currentStep'];
        this.emit('LaunchRequest');
    },
    'AMAZON.HelpIntent': function () {
        this.response.speak(this.t('HELP')).listen(this.t('HELP'));
        this.emit(':responseReady');
    },
    'AMAZON.CancelIntent': function () {
        this.response.speak(this.t('STOP'));
        this.emit(':responseReady');
    },
    'AMAZON.StopIntent': function () {
        this.emit('SessionEndedRequest');
    },
    'SessionEndedRequest': function () {
        delete this.attributes['currentStep'];
        console.log('session ended!');
        var postData = {
            payload: "stop"
        };

        var self = this;
        request({
            url: 'https://graspio-alexa-app.herokuapp.com/send-data',
            method: 'POST',
            json: postData
        }, function (error, response, body) {
            self.response.speak(self.t('STOP'));
            self.emit(':responseReady');
        });
    }
};

//    END of Intent Handlers {} ========================================================================================
// 3. Helper Function  =================================================================================================

function incrementStep(increment) {
    if (!this.attributes['currentStep']) {
        this.attributes['currentStep'] = 1;
    } else {
        this.attributes['currentStep'] = this.attributes['currentStep'] + increment;
        if (this.attributes['currentStep'] < 0) {
            this.attributes['currentStep'] = 0;
        }
    }
    return this.attributes['currentStep'];
}


function sayArray(myData, andor) {
    //say items in an array with commas and conjunctions.
    // the first argument is an array [] of items
    // the second argument is the list penultimate word; and/or/nor etc.

    var listString = '';

    if (myData.length == 1) {
        //just say the one item
        listString = myData[0];
    } else {
        if (myData.length == 2) {
            //add the conjuction between the two words
            listString = myData[0] + ' ' + andor + ' ' + myData[1];
        } else if (myData.length == 4 && andor == 'and') {
            //read the four words in pairs when the conjuction is and
            listString = myData[0] + " and " + myData[1] + ", as well as, " +
                myData[2] + " and " + myData[3];

        } else {
            //build an oxford comma separated list
            for (var i = 0; i < myData.length; i++) {
                if (i < myData.length - 2) {
                    listString = listString + myData[i] + ', ';
                } else if (i == myData.length - 2) { //second to last
                    listString = listString + myData[i] + ', ' + andor + ' ';
                } else { //last
                    listString = listString + myData[i];
                }
            }
        }
    }

    return (listString);
}

function randomArrayElement(array) {
    var i = 0;
    i = Math.floor(Math.random() * array.length);
    return (array[i]);
}