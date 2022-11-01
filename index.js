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
ig.state.generateDevice(process.env.ig_username)

// const dbx = new Dropbox.Dropbox({ accessToken: process.env.db_access_token })
// dbx.filesListFolder({path: '/000000_BlueCopper'}).then(res => console.log(res.result)).catch(err => console.log(err));

function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min)
}

app.get('/post/happy-hour-story', function (req, res) {
    postHappyHourStory().then(() => res.send('Successfully posted happy hour story.')).catch(() => res.send('Error posting happy hour story, maybe you need to login?')
    )
});

app.get('/post/hours-story', function (req, res) {
    postHoursStory().then(() => res.send('Successfully posted hours story.')).catch(() => res.send('Error posting story, maybe you need to login?'))
})

app.get('/login', function (req, res) {
    login().then(() => res.send("Successfully logged in.")).catch(() => res.send('Error logging in.'))
})

async function postHappyHourStory() {
    const file = await readFileAsync(`./h_${randomBetween(0, 2)}.jpg`)
    await ig.publish.story({
        file
    })
}

async function postHoursStory() {
    // TODO: build out method
}

async function login() {
    await ig.account.login(process.env.ig_username, process.env.ig_password)
}
