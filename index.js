import * as dotenv from 'dotenv';
dotenv.config()

import { IgApiClient } from 'instagram-private-api';
import { IgCheckpointError } from 'instagram-private-api';
import { promisify } from 'util'
import { readFile } from 'fs';

import  Dropbox  from 'dropbox';

import express from 'express';
const app = express()

app.listen(3000)

const readFileAsync = promisify(readFile);

const ig = new IgApiClient();
ig.state.generateDevice(process.env.ig_username_personal)

const dbx = new Dropbox.Dropbox({ accessToken: process.env.db_access_token })
dbx.filesListFolder({path: ''}).then(res => console.log(res.status)).catch(err => console.log(err));

function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min)
}

app.get('/post', function (req, res) {
    post().then(() => res.send('posted')).catch(() => res.send('error posting'))
});

app.get('/login', function (req, res) {
    login().then(() => res.send("logged in")).catch(() => res.send('error logging in'))
})

app.get('/photos', function (req, res) {
    dbx.filesListFolder({path: ''}).then(res => {
        console.log(res);
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
        file
    })
}

async function login() {
    await ig.account.login(process.env.ig_username_personal, process.env.ig_password_personal)
}
