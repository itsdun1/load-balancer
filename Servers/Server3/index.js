const express = require('express');
const app = express();
const port = 3003;

app.get('/info', (req, res) => {
    return res.status(200).send({success: true, data: {version : 1, port: 3003}})
})

app.post('/info', (req, res) => {
    console.log('Inside post')
    console.log(req.body);
    return res.status(200).send({success: true, data: {version : 1, port: 3003}})
})

app.listen(port, () => {
    console.log('Server Listening on ', port);
})