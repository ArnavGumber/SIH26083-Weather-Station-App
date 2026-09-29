const express = require('express');
const app = express();

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
});
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const { calculateWBGT } = require('./wbgt');
const { calculateUTCI } = require('./utci');

const admins = {
    'arnav@123': '0000'
}

const wardDataJSON = require('./ward-data.json');

let wardData = wardDataJSON["wards"];

setInterval(() => {
    let wardArr = [];
    wardData.forEach(ward => {
        let tempChange = (Math.random()*2 - 1).toFixed(2);
        let newTemp = parseFloat(ward["temperature"]) + parseFloat(tempChange);
        if (newTemp < 20) { newTemp += 3 }
        if (newTemp > 40) { newTemp -= 3 }

        let humidityChange = (Math.random()*10 - 5).toFixed(2);
        let newHumidity = parseFloat(ward["humidity"]) + parseFloat(humidityChange);
        if (newHumidity < 20) { newHumidity += 5 }
        if (newHumidity > 70) { newHumidity -= 5 }

        let windSpeedChange = (Math.random()*0.4 - 0.2).toFixed(2);
        let newWindSpeed = parseFloat(ward["windSpeed"]) + parseFloat(windSpeedChange);
        if (newWindSpeed < 0.1) { newWindSpeed += 0.2 }
        if (newWindSpeed > 10) { newWindSpeed -= 0.2 }

        let solarRadiationChange = (Math.random()*10 - 5).toFixed(2);
        let newsolarRadiation = parseFloat(ward["solarRadiation"]) + parseFloat(solarRadiationChange);
        if (newsolarRadiation < 590) { newsolarRadiation += 10 }
        if (newsolarRadiation > 650) { newsolarRadiation -= 10 }

        wardArr.push({
            name: ward["name"],
            temperature: parseFloat(newTemp.toFixed(2)),
            humidity: parseFloat(newHumidity.toFixed(2)),
            windSpeed: parseFloat(newWindSpeed.toFixed(2)),
            solarRadiation: parseFloat(newsolarRadiation.toFixed(2)),
            description: ward["description"]
        })

        wardData = wardArr;
    })
}, 3000)

async function sendSMS(to, message) {
    console.log("Gateway response: SMS SENT");
    return 'SMS Sent';
}

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/pages/index.html')
})

app.post('/weather-report', (req, res) => {
    res.json(wardData);
})

app.get('/send-alert/:wardName', (req, res) => {
    const { wardName } = req.params;
    res.send('Alert sent to ' + wardName);
})

app.post("/api/send-sms", async (req, res) => {

    try {

        const { to, message } = req.body;

        // Basic validation
        if (!to || !message) {
            return res.status(400).json({
                success: false,
                error: "Both 'to' and 'message' are required."
            });
        }

        // Send through Android + Traccar
        const result = await sendSMS(to, message);

        res.json({
            success: true,
            message: "SMS sent successfully.",
            gatewayResponse: result
        });

    } catch (error) {

        console.error("SMS Error:", error);

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/authLoginForUI', (req, res) => {
    const administratorId = req.body.administratorId;
    const administratorPassword = req.body.administratorPassword;
    if (admins[administratorId] == administratorPassword) {
        res.send('verified');
    }
    else res.send('Invalid Credentials')
})

app.get('/calculateWBGT/:slug', (req, res) => {
    const [temperature, humidity, windSpeed, solarRadiation] = req.params.slug.split('-').map(Number);

    if ([temperature, humidity, windSpeed, solarRadiation].some(value => !Number.isFinite(value))) {
        return res.status(400).json({ error: 'Invalid weather values.' });
    }

    const date = new Date();

    const wbgt = calculateWBGT({
        temperature,
        humidity,
        windSpeed,
        windSpeedHeight: 5,
        solarRadiation,
        pressure: 1007.25,
        latitude: 30.733,
        longitude: 76.788,
        timestamp: date.toISOString(),
        temperatureDiff: 0,
        urban: true
    });
    const utci = calculateUTCI(
        temperature,
        humidity,
        Math.max(windSpeed, 0.51),
        solarRadiation
    );

    let result = {
        ...wbgt,
        ...utci
    }
    res.json(result);
})

app.listen(3000, () => {
    console.log('Server running');
})