import * as dotenv from 'dotenv';
dotenv.config()

import { IgApiClient } from 'instagram-private-api';
import { promisify } from 'util'
import { readFile, readdir, unlink } from 'fs';

import Jimp from 'jimp';

import express from 'express';
import { resolveSoa } from 'dns';
const app = express()

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
        console.log("test");
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
    res.send(`Pausing for ${duration} hours.`)
})

app.get('/resume', async function (req, res) {
    timeTilRun = 0;
    run = true;
    res.send("Resuming regular operations.")
})

app.get('/post/story/happy-hour', function (req, res) {
    const dayOfWeek = new Date().getDay();
    const isWeekend = (dayOfWeek === 6) || (dayOfWeek === 0);
    if (!isWeekend && run)
        postHappyHourStory(res).then(() => res.send('Successfully posted happy hour story.')).catch(() => res.send("Error posting -- do you need to log in?"))
});

app.get('/post/story/hours', function (req, res) {
    const dayOfWeek = new Date().getDay();
    const isWeekend = (dayOfWeek === 6) || (dayOfWeek === 0);
    if (run)
        postHoursStory((isWeekend ? '9a - 4p' : '8a - 3p'), (isWeekend ? '8a - 3p' : '7a - 2p'), res).then(() => res.send('Successfully posted hours story.')).catch(() => res.send("Error posting -- do you need to log in?"))
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
        postCustomStory(caption).then(() => res.send("Successfully posted custom story.")).catch(() => res.send("Error posting -- do you need to log in?"))
})

app.get('/login', function (req, res) {
    if (run)
        login().then(() => res.send("Successfully logged in.")).catch((err) => res.send(JSON.stringify(err)))
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
                totalLikes ++;
                console.log(`Liked post: ${r.items[i].id} - by @${r.items[i].user.full_name} - with ${r.items[i].like_count} likes.`)
            }
        }).catch(() => res.send("Error posting -- do you need to log in?"))
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
        console.log(err);
        res.send("Error posting -- do you need to log in?")
    }
}

async function postHoursStory(bccrHours, bc2kHours, res) {
    const dir = './img/dbx'
    try {
        const files = await readdirAsync(dir)
        const index = randomBetween(0, files.length - 1)
        const image = await Jimp.read(`${dir}/${files[index]}`)
        const font = await Jimp.loadFont('./fnt/futura-yellow.fnt')
        const font1 = await Jimp.loadFont('./fnt/futura-pink.fnt')
        console.log(`index: ${index}`)
        console.log(`file: ${files[index]}`)
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
        // logger? 
        console.log(err);
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
