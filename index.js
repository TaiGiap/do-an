const express = require('express');

const app = express();
const port = 3000;

const http = require('http').createServer(app);
const io = require('socket.io')(http, { pingInterval: 500 });

const mongoose = require('mongoose')
const { MongoClient } = require("mongodb");
const ObjectId = require('mongodb').ObjectId;

const URL = 'mongodb+srv://db-taigiap:mothaiba.123@users.ybzmtjg.mongodb.net/test';

const client = new MongoClient(URL);


app.set('view engine', 'html');
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get("/", (req, res) => {
    res.send(`<div>
        HOME PAGE
    </div>`);
});

app.post("/api/auth/login-account", async (req, res) => { 
    try { 
        const { userName, password } = req.body;

        if(userName && password) { 
            const query = { _user_name: userName, _password: password };

            const database = client.db("production");
            const userCluster = database.collection("users");

            let userFind = await userCluster.findOne(query);

            if(userFind) {
                res.status(200).json({ status: 'SUCCESS', message: userFind._id});
            } else {
                res.status(400).json({ status: 'ERROR', message: 'USERNAME OR PASSWORD INVALID!'});
            }
        }
        else 
            res.status(400).json({ status: 'ERROR', message: 'DATA REQUEST FAILED!'});

    } catch(err) {
        console.log(error.message, error);
    }
})

app.post("/api/auth/create-account", async (req, res) => {
    try {
        const { userName, password } = req.body;
        
        if(userName && password) {

            let dataInsert = {
                _user_name: userName,
                _password: password
            }
            
            const database = client.db("production");
            const userCluster = database.collection("users");

            const query = { _user_name: userName };
            let userFind = await userCluster.findOne(query);

            if(userFind) return res.status(400).json({ status: 'ERROR', data: "EMAIL ALREADY EXSIST!"});

            const result = await userCluster.insertOne(dataInsert);

            console.log(`A document was inserted with the _id: ${result.insertedId}`);

            res.status(200).json({ status: 'SUCCESS', data: result.insertedId});
        }
        else 
            res.status(400).json({ status: 'ERROR', message: 'DATA REQUEST FAILED!'});
    } catch (error) {
        console.log(error.message, error);
    }
});



const connectDB = async () => {
    try {
        mongoose.connect(URL,{ useNewUrlParser: true, useUnifiedTopology: true })
        console.log('Connected to mongoDB')
    } catch (error) {
        console.log(error)
        process.exit(1)
    }
}


http.listen(3000, () => {
    connectDB();
    console.log('Server started: http://localhost:'+ port +'/');
});

let usersConnect = [];

io.on('connection', (socket) => {
    console.log('a user connected', socket.id);

    socket.on('userConnected', async (userId) => {
        const database = client.db("production");
        const userCluster = database.collection("users");

        if(usersConnect && usersConnect.length > 0)
            socket.emit("getListUserActive", usersConnect.filter(us => us.userId !== userId).map(user => { return { userId: user.userId, userName: user.userName }}));

        const query = { _id: new ObjectId(userId) };
        let userFind = await userCluster.findOne(query);

        if(userFind) {
            let filterArr = usersConnect && usersConnect.length > 0 && usersConnect.filter(fl => fl.userId === userId);

            if(!filterArr || filterArr.length <= 0)
                usersConnect = usersConnect.concat({
                    userId: userId,
                    userName: userFind._user_name,
                    socketId: socket.id,
                })
        }
       
        if(usersConnect && usersConnect.length > 0) {
            socket.emit("getListUserActive", usersConnect.filter(us => us.userId !== userId).map(user => { return { userId: user.userId, userName: user.userName }}));
        } else {
            socket.emit("getListUserActive", []);
        }

        socket.on("ConnectRoom", (idRoom, idRoom2) => {
            socket.join(idRoom);
            socket.join(idRoom2);

            socket.on("SendDataPrivate", (room, fileName, data) => {
                console.log(room, fileName);
                io.sockets.in(room).emit('ReceivedData', { fileName, file: data });
            });
        })
        
        
    });

 

    socket.on('sendFile', (fileName, file) => {
        socket.emit("responseFile", { fileName, file });
        // console.log(fileName, file);
    });
});