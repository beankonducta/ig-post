import * as dotenv from 'dotenv';
dotenv.config()

import { IgApiClient } from 'instagram-private-api';
import { IgCheckpointError } from 'instagram-private-api';
import { promisify } from 'util'
import { readFile } from 'fs';

import Dropbox from 'dropbox';

import express from 'express';
const app = express()

app.listen(3000)

const readFileAsync = promisify(readFile);

const ig = new IgApiClient();
ig.state.generateDevice(process.env.ig_username_personal)

const dbx = new Dropbox.Dropbox({ accessToken: process.env.db_access_token })
dbx.filesListFolder({path: '/000000_BlueCopper'}).then(res => console.log(res.result)).catch(err => console.log(err));

function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min)
}

app.get('/post', function (req, res) {
    // logging in before posting each time could be a solution or a problem *shrug*
    // it seems like it could possibly be causing my IG account on phone to get kicked out
    login().then(() => {
        post().then(() => res.send('posted')).catch(() => {
            res.send('error posting')
        })
    }).catch(() => res.send("cant log in or post"))
});

app.get('/login', function (req, res) {
    login().then(() => res.send("logged in")).catch(() => res.send('error logging in'))
})

app.get('/photos', function (req, res) {
    dbx.media({path: '/000000_BlueCopper'}).then(r => {
        r.result.entries.forEach(val => {
            console.log("ENTRY: ");
            console.log(val);
        })
        res.send(""+r.result.entries.length)
        const len = r.result.entries.length;
        const ran = randomBetween(0, len -1);
        // get all photos
        // pick a random photo
        // pick a random caption ??
        // post the photo and caption
        // mark the photo as used

        // ALTERNATIVELY:

        // pick a random photo
        // post the photo with hours text over it (like grid city does)
    })
})

async function post() {
    const file = await readFileAsync(`./h_${randomBetween(0, 2)}.jpg`)
    await ig.publish.story({
        file,
        caption: "this is a test"
    })
}

async function login() {
    await ig.account.login(process.env.ig_username_personal, process.env.ig_password_personal)
}
