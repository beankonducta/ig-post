import * as dotenv from 'dotenv';
dotenv.config()

import { IgApiClient } from 'instagram-private-api';
import { IgCheckpointError } from 'instagram-private-api';
import { promisify } from 'util'
import { readFile } from 'fs';

import express from 'express';
const app = express()

app.listen(3000)

const readFileAsync = promisify(readFile);

const ig = new IgApiClient();
ig.state.generateDevice(process.env.ig_username_personal)

function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min)
}

app.get('/post', function (req, res) {
    post().then(() => res.send('posted')).catch(() => res.send('error posting'))
});

app.get('/login', function (req, res) {
    login().then(() => res.send("logged in")).catch(() => res.send('error logging in'))
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
