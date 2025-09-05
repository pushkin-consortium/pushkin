import express from 'express';
import amqp from 'amqplib';
import { v4 as uuid } from 'uuid';
import bodyParser from 'body-parser';
import cors from 'cors';
import cookieSession from 'cookie-session';
import fs from 'fs';

export default class PushkinAPI {
    constructor(expressPort, amqpAddress, key) {
        this.expressPort = expressPort;
        this.amqpAddress = amqpAddress;
        this.initialized = false;

        // Check if .env file exists
        if (fs.existsSync('.env')) {
            // If .env file exists, append cookie secret key variable
            fs.appendFileSync('.env', `COOKIE_SESSION_SECRET=${key}\n`);
            console.log('Cookie session secret key appended to .env file.');
        } else {
            // If .env file does not exist, create it and set cookie secret key variable
            fs.writeFileSync('.env', `COOKIE_SESSION_SECRET=${key}\n`);
            console.log('Secret key generated and stored in .env file.');
        }
        
        this.app = express();
        this.app.set('trust-proxy', 1);
        this.app.use(cookieSession({
            name: 'session',
            maxAge: 24 * 60 * 60 * 1000,
            keys: [key]
        }));
        this.app.use( (req, res, next) => {
            req.session.id = req.session.id || uuid();
            console.log(`API got request for ${req}`);
            next();
        });
        this.app.use(bodyParser.json());
        this.app.use(cors());
        this.expressListening = false;
        this.server = null;
        this.app.get('/', function (req, res) {
            res.send('👨‍🔬💬👩‍🔬')
        })
    }

    async init() {
        return new Promise((resolve, reject) => {
            amqp.connect(this.amqpAddress)
                .then(conn => {
                    this.conn = conn;
                    this.initialized = true;
                    console.log('API init connected');
                    resolve();
                })
                .catch(err => {
                    reject(`Error connecting to message queue: ${err}`);
                });
        });
    }

    useController(route, controller) {
        if (this.expressListening)
            throw new Error('Unable to add controllers after the API has started.');
        console.log('API using controller');
        this.app.use(route, controller); }

    usePushkinController(route, pushkinController) {
        if (this.expressListening)
            throw new Error('Unable to add controllers after the API has started.');
        if (!this.initialized)
            throw new Error('The API must first be initialized by calling .init().');
        this.useController(route, pushkinController.getConnFunction()(this.conn));
    }

    //enableCoreRoutes() { this.usePushkinController('/api', coreRouter); }

    start() {
        if (!this.initialized)
            throw new Error('The API hasn\'t been successfully initialized');
        this.expressListening = true;
        this.server = this.app.listen(this.expressPort, async () => {
            console.log(`Pushkin API listening on port ${this.expressPort}`);
        });
    }

}
