const express = require('express');
bodyParser = require('body-parser');
const app = express();
const port = 3001;
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: true }));

app.get('/info', (req, res) => {
    console.log('Inside get')
    return res.status(200).send({success: true, data: {version : 1, port: 3001}})
})

app.post('/info', (req, res) => {
    console.log('Inside post')
    console.log(req.body);
    throw new Error(400);
    return res.status(200).send({success: true, data: {version : 1, port: 3001}})
})

app.listen(port, () => {
    console.log('Server Listening on ', port);
})

