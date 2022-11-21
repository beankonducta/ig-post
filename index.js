import * as dotenv from 'dotenv';
dotenv.config()

import { IgApiClient } from 'instagram-private-api';
import { promisify } from 'util'
import { readFile, readdir, unlink, appendFile } from 'fs';

import Jimp from 'jimp';

import express from 'express';
const app = express()

// TODO:
// I could have my payroll bot hit the /stop endpoint on holidays! EZ. Just need to host the server / expose it to the net

// TODO:
// Make hours poster more robust

// TODO:
// Add post liker to CRON

// flag to skip posting if we hit the /stop endpoint
let run = true;
let timeTilRun = 0;

let totalLikes = 0;

// auth object, might need later
let auth;

app.listen(3000, () => {
    console.log('Server started on port 3000!')
})

const readFileAsync = promisify(readFile);
const readdirAsync = promisify(readdir);
const unlinkAsync = promisify(unlink);
const appendFileAsync = promisify(appendFile)

// init IG instance
const ig = new IgApiClient();
ig.state.generateDevice(process.env.ig_username)

const delay = ms => new Promise(res => setTimeout(res, ms))

function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min)
}

function tick() {
    if (timeTilRun > 0)
        timeTilRun -= 1000 * 60 * 15 // 15 mins
    if (timeTilRun <= 0) {
        timeTilRun = 0 // reset to 0
        run = true
    }

}

function log(message) {
    appendFileAsync('log.txt', `\n ${new Date()} - ${message}`).then(() => { });
}

// every 15 mins, check timer
setInterval(tick, 1000 * 60 * 15);

/*
* TEST HERE
*/

app.get('/test', async function (req, res) {
    res.send("I am alive!");
});

app.get('/test/delay', async function (req, res) {
    f.forEach(() => {
        delay(randomBetween(1000, 5000))
    })
});

app._router.get('/test/total-likes', async function (req, res) {
    res.send(`Total likes since boot: ${totalLikes}`)
})

app.get('/dbx-test', async function (req, res) {
    const dir = './img/dbx'
    const files = await readdirAsync(dir)
    const index = randomBetween(0, files.length - 1)
    res.send(`${dir}/0_${files[index]}`)
})

app.get('/time-til-run', async function (req, res) {
    if (timeTilRun > 0)
        if (!req.query.ms)
            res.send(`Hours til pause ends: ${timeTilRun / 1000 / 60 / 60}`)
        else
            res.send(`Ms til pause ends: ${timeTilRun}`)
    else res.send('Currently running!')
})

/*
* END TESTS
*/

app.get('/pause', async function (req, res) {
    // duration, in hours to pause
    const duration = req.query.duration
    if (isNaN(duration)) {
        res.send("Invalid duration! That's not a number. Hint: ?duration=1")
        return;
    }
    if (duration < 0) {
        res.send("Duration must be greater than 0!")
        return;
    }
    timeTilRun = +duration * 3600000 // convert provided hours to ms
    run = false;
    log(`Pausing for ${duration} hours.`)
    res.send(`Pausing for ${duration} hours.`)
})

app.get('/resume', async function (req, res) {
    timeTilRun = 0;
    run = true;
    log(`Resuming regular operations.`)
    res.send("Resuming regular operations.")
})

app.get('/post/story/happy-hour', function (req, res) {
    const dayOfWeek = new Date().getDay();
    const isWeekend = (dayOfWeek === 6) || (dayOfWeek === 0);
    if (!isWeekend && run)
        postHappyHourStory(res).then(() => {
            log(`Successfully posted happy hour story.`)
            res.send('Successfully posted happy hour story.')
        }).catch(() => {
            log(`Error posting happy hour story.`)
            res.send("Error posting -- do you need to log in?")
        })
});

app.get('/post/story/hours', function (req, res) {
    const dayOfWeek = new Date().getDay();
    const isWeekend = (dayOfWeek === 6) || (dayOfWeek === 0);
    if (run)
        postHoursStory((isWeekend ? '9a - 4p' : '8a - 3p'), (isWeekend ? '8a - 3p' : '7a - 2p'), res).then(() => {
            log(`Successfully posted hours story.`)
            res.send('Successfully posted hours story.')
        }).catch(() => {
            log(`Error post hours story.`)
            res.send("Error posting -- do you need to log in?")
        })
})

app.get('/post/story/custom', function (req, res) {
    const caption = req.query.caption;
    const ignorePause = req.query.ignorePause;
    if (!caption) {
        res.send("Caption required! Hint: ?caption=this is a caption br this is the second line");
        return;
    }
    if (caption.length > 200) { // dunno if this is the right number, just random
        res.send("Caption too long! Max of 200 chars.");
        return;
    }
    if (run || ignorePause)
        postCustomStory(caption).then(() => {
            log(`successfully posted custom story.`)
            res.send("Successfully posted custom story.")
        }).catch(() => {
            log(`Error posting custom story.`)
            res.send("Error posting -- do you need to log in?")
        })
})

app.get('/login', function (req, res) {
    if (run)
        login().then(() => {
            log(`Successfully logged in.`)
            res.send("Successfully logged in.")
        }).catch((err) => {
            log(`Error logging in. Likely a challenge is needed.`)
            res.send(JSON.stringify(err))
        })
})

app.get('/like/tag', function (req, res) {
    const q = req.query.tag;
    const min = req.query.min;
    const max = req.query.max;
    if (!q || q === "") {
        res.send("Must supply a tag in query. Hint: ?tag=something")
        return;
    }
    if (run) {
        searchByTag(q).then(async (r) => {
            res.send(`Successfully searched for ${q}.`)
            for (let i = 0; i < r.items.length - 1; i++) {
                await delay(randomBetween(+min, +max));
                likePost(r.items[i].id)
                totalLikes++;
                log(`Liked post: ${r.items[i].id} - by @${r.items[i].user.full_name} - with ${r.items[i].like_count} likes.`)
            }
        }).catch(() => {
            log(`Error liking posts by tag ${q}.`)
            res.send("Error liking posts -- do you need to log in?")
        })
    }
})

async function postHappyHourStory(res) {
    const dir = './img/hh'
    try {
        const files = await readdirAsync(dir)
        const file = await readFileAsync(`${dir}/${files[randomBetween(0, files.length - 1)]}`)
        await ig.publish.story({
            file
        })
    } catch (err) {
        // logger? 
        log(`Error reading files to post happy hour story.`)
        res.send("Error posting -- do you need to log in?")
    }
}

async function postHoursStory(bccrHours, bc2kHours, res) {
    const dir = './img/dbx'
    const ranPost = randomBetween(0, 10)
    if (ranPost < 4) {
        res.send("Not posting -- random number was less than 4!"
        )
        return;
    }
    try {
        const files = await readdirAsync(dir)
        const index = randomBetween(0, files.length - 1)
        const image = await Jimp.read(`${dir}/${files[index]}`)
        const font = await Jimp.loadFont('./fnt/futura-yellow.fnt')
        const font1 = await Jimp.loadFont('./fnt/futura-pink.fnt')
        const w = image.getWidth()
        const h = image.getHeight()
        // need to calculate the length of the string somehow
        const line1 = 'Hours Today:';
        const line2 = `BCCR: ${bccrHours}`;
        const line3 = `BC2K: ${bc2kHours}`;
        const line1len = Jimp.measureText(font, line1);
        const line2len = Jimp.measureText(font, line2);
        const line3len = Jimp.measureText(font, line3);
        log(`Hours story index: ${index}`)
        log(`Hours story file: ${files[index]}`)
        const roll = randomBetween(0, 1);
        if (roll === 1) {
            image.print(font, 10, 10, line1)
            image.print(font, 10, 110, line2)
            image.print(font1, 10, 210, line3)
        } else if(roll === 0) {
            image.print(font, w / 2 - line1len - 10, 10, line1)
            image.print(font, w / 2- line2len - 10, 110, line2)
            image.print(font1, w / 2 - line3len - 10, 210, line3)
        }
        await image.writeAsync(`${dir}/0_${files[index]}`)
        const file = await readFileAsync(`${dir}/0_${files[index]}`)
        await unlinkAsync(`${dir}/0_${files[index]}`)
        await ig.publish.story({
            file
        })
    } catch (err) {
        log(`Error reading files to post hours story.`)
        res.send("Error posting -- do you need to log in?")
    }
}

async function postCustomStory(caption, res) {
    const dir = './img/dbx'
    try {
        const files = await readdirAsync(dir)
        const index = randomBetween(0, files.length - 1)
        const image = await Jimp.read(`${dir}/${files[index]}`)
        const font = await Jimp.loadFont('./fnt/futura-yellow.fnt')
        const font1 = await Jimp.loadFont('./fnt/futura-pink.fnt')
        const ran = randomBetween(0, 1)
        const split = caption.split(" br ");
        split.forEach((line, index) => {
            if (line !== " br ")
                image.print((ran === 0 ? font : font1), 10, 10 + (index * 100), line)
        })
        await image.writeAsync(`${dir}/0_${files[index]}`)
        const file = await readFileAsync(`${dir}/0_${files[index]}`)
        await unlinkAsync(`${dir}/0_${files[index]}`)
        await ig.publish.story({
            file
        })
    } catch (err) {
        log(`Error reading files to post custom story.`)
        res.send("Error posting -- do you need to log in?")
    }
}

async function login() {
    auth = await ig.account.login(process.env.ig_username, process.env.ig_password);
}

async function searchByTag(query) {
    return await ig.feed.tag(query).request();
}

async function likePost(postId) {
    await ig.media.like({
        mediaId: postId,
        moduleInfo: {
            module_name: 'profile',
            user_id: auth.pk,
            username: process.env.ig_username,
        },
        d: 1
    })
}
