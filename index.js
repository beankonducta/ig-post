import * as dotenv from 'dotenv';
dotenv.config()

import { IgApiClient } from 'instagram-private-api';
import { promisify } from 'util'
import { readFile, readdir, unlink } from 'fs';

import Jimp from 'jimp';

import express from 'express';
const app = express()

app.listen(3000, () => {
    console.log('Server started on port 3000!')
})

const readFileAsync = promisify(readFile);
const readdirAsync = promisify(readdir);
const unlinkAsync = promisify(unlink);

// init IG instance
const ig = new IgApiClient();
ig.state.generateDevice(process.env.ig_username)

function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min)
}

app.get('/test', function (req, res) {
    res.send("I am alive!");
});

app.get('/dbx-test', async function (req, res) {
    const dir = './img/dbx'
    const files = await readdirAsync(dir)
    const index = randomBetween(0, files.length - 1)
    res.send(`${dir}/0_${files[index]}`)
})

app.get('/post/happy-hour-story', function (req, res) {
    const dayOfWeek = new Date().getDay();
    const isWeekend = (dayOfWeek === 6) || (dayOfWeek === 0);
    if (!isWeekend)
        postHappyHourStory().then(() => res.send('Successfully posted happy hour story.')).catch(() => res.send('Error posting happy hour story, maybe you need to login?')
        )
});

app.get('/post/hours-story', function (req, res) {
    const dayOfWeek = new Date().getDay();
    const isWeekend = (dayOfWeek === 6) || (dayOfWeek === 0);
    postHoursStory((isWeekend ? '9a - 4p' : '8a - 3p'), (isWeekend ? '8a - 3p' : '7a - 2p')).then(() => res.send('Successfully posted hours story.')).catch(() => res.send('Error posting story, maybe you need to login?'))
})

app.get('/login', function (req, res) {
    login().then(() => res.send("Successfully logged in.")).catch((err) => res.send(JSON.stringify(err)))
})

async function postHappyHourStory() {
    const dir = './img/hh'
    try {
        const files = await readdirAsync(dir)
        const file = await readFileAsync(`${dir}/${files[randomBetween(0, files.length - 1)]}`)
        await ig.publish.story({
            file
        })
    } catch (err) {
        // logger? 
        console.log(err);
    }
}

async function postHoursStory(bccrHours, bc2kHours) {
    const dir = './img/dbx'
    try {
        const files = await readdirAsync(dir)
        const index = randomBetween(0, files.length - 1)
        const image = await Jimp.read(`${dir}/${files[index]}`)
        const font = await Jimp.loadFont('./fnt/futura-yellow.fnt')
        const font1 = await Jimp.loadFont('./fnt/futura-pink.fnt')
        image.print(font, 10, 10, 'Hours Today:')
        image.print(font, 10, 110, `BCCR: ${bccrHours}`)
        image.print(font1, 10, 210, `BC2K: ${bc2kHours}`)
        await image.writeAsync(`${dir}/0_${files[index]}`)
        const file = await readFileAsync(`${dir}/0_${files[index]}`)
        await unlinkAsync(`${dir}/0_${files[index]}`)
        await ig.publish.story({
            file
        })
    } catch (err) {
        // logger? 
        console.log(err);
    }
}

async function login() {
    await ig.account.login(process.env.ig_username, process.env.ig_password)
}
