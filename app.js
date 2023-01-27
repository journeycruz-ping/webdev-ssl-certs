import * as tls from 'tls';
import https from 'https';
import cron from 'node-cron';
import * as dotenv from 'dotenv'
dotenv.config()

cron.schedule("* * * * *", function() {
    console.log(process.env.WEBHOOK_URL)
    const getX509Certificate = host => {
        let socket = tls.connect({
            port: 443,
            host,
            servername: host,
        }, () => {
            let x509Certificate = socket.getPeerX509Certificate();
            let validUntil = new Date(x509Certificate.validTo),
                validFrom = new Date(x509Certificate.validFrom);
            console.log("Days remaining: " + getDaysRemaining(new Date(), validUntil));

            const yourWebHookURL = process.env.WEBHOOK_URL;

            // const userAccountNotification = {
            //     'attachments': [{ // this defines the attachment block, allows for better layout usage
            //         'color': '#eed140', // color of the attachments sidebar.
            //         'fields': [ // actual fields
            //             {
            //                 'title': 'Site', // Custom field
            //                 'value': host, // Custom value
            //                 'short': true // long fields will be full width
            //             },
            //             {
            //                 'title': 'Days Remaining',
            //                 'value': getDaysRemaining(new Date(), validUntil),
            //                 'short': true
            //             }
            //         ]
            //     }]
            // };

            const userAccountNotification = {
                'attachments': [{ // this defines the attachment block, allows for better layout usage
                    'color': '#eed140', // color of the attachments sidebar.
                    'fields': [ // actual fields
                        {
                            'title': 'Test Notification', // Custom field
                            'value': 'testing node-cron scheduler, this message should repeat every minute.', // Custom value
                            'short': false // long fields will be full width
                        }
                    ]
                }]
            };

            /**
             * Handles the actual sending request. 
             * We're turning the https.request into a promise here for convenience
             * @param webhookURL
             * @param messageBody
             * @return {Promise}
             */
            function sendSlackMessage(webhookURL, messageBody) {
                // make sure the incoming message body can be parsed into valid JSON
                try {
                    messageBody = JSON.stringify(messageBody);
                } catch (e) {
                    throw new Error('Failed to stringify messageBody', e);
                }

                // Promisify the https.request
                return new Promise((resolve, reject) => {
                    // general request options, we defined that it's a POST request and content is JSON
                    const requestOptions = {
                        method: 'POST',
                        header: {
                            'Content-Type': 'application/json'
                        }
                    };

                    // actual request
                    const req = https.request(webhookURL, requestOptions, (res) => {
                        let response = '';


                        res.on('data', (d) => {
                            response += d;
                        });

                        // response finished, resolve the promise with data
                        res.on('end', () => {
                            resolve(response);
                        })
                    });

                    // there was an error, reject the promise
                    req.on('error', (e) => {
                        reject(e);
                    });

                    // send our message body (was parsed to JSON beforehand)
                    req.write(messageBody);
                    req.end();
                });
            }

            // main
            (async function() {
                if (!yourWebHookURL) {
                    console.error('Please fill in your Webhook URL');
                }

                console.log('Sending slack message');
                try {
                    const slackResponse = await sendSlackMessage(yourWebHookURL, userAccountNotification);
                    console.log('Message response', slackResponse);
                } catch (e) {
                    console.error('There was a error with the request', e);
                }
            })();
        });
    };

    const getDaysBetween = (validFrom, validTo) => {
        return Math.round(Math.abs(+validFrom - +validTo) / 8.64e7);
    };

    const getDaysRemaining = (validFrom, validTo) => {
        const daysRemaining = getDaysBetween(validFrom, validTo);
        if (new Date(validTo).getTime() < new Date().getTime()) {
            return -daysRemaining;
        }
        return daysRemaining;
    };

    getX509Certificate("www.pingidentity.com");
})