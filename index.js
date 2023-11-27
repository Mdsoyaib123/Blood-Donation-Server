const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
var jwt = require("jsonwebtoken");
const app = express();
require("dotenv").config();
const cors = require("cors");
const port = process.env.PORT || 5000;
const cookieParser = require("cookie-parser");

// middleWare
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.2amfc4s.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    // collection
    const usersCollection = client.db("BloodDonationDb").collection("users");

    // verifyToken
    const verifyToken = (req, res, next) => {
      const token = req.cookies?.token;
      if (!token) {
        return res.status(401).send({ message: "unAuthorized access" });
      }
      jwt.verify(token, process.env.ACCESS_TOKEN, (error, decoded) => {
        if (error) {
          return res.status(401).send({ message: "unAuthorized access" });
        }
        // console.log("decoded token ", decoded);
        req.user = decoded;
        next();
      });
    };

    // verifyAdmin
    const verifyAdmin = async (req, res, next) => {
      const email = req.user.email;
      
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };


    // create jwt token
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "24h",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    //  usersCollection
    app.get("/users",verifyToken,verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });
    app.get('/users/adminProfile/:email',verifyToken,verifyAdmin,async(req,res)=>{
      const email = req.params.email 
      const query = {email: email}
      const result = await usersCollection.findOne(query)
      res.send(result)
    })
    app.get('/users/volunteerProfile/:email',verifyToken,async(req,res)=>{
      const email = req.params.email 
      const query = {email: email}
      const result = await usersCollection.findOne(query)
     
      res.send(result)
    })
    app.get('/users/userProfile/:email',verifyToken,async(req,res)=>{
      const email = req.params.email 
      const query = {email: email}
      const result = await usersCollection.findOne(query)
     
      res.send(result)
    })
    app.get('/UpdateProfile/:id',async(req,res)=>{
      const id = req.params.id
      const query= {_id: new ObjectId(id)}
      const result = await usersCollection.findOne(query) 
     res.send(result)
    })

    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (!email == req.user.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      // console.log(user);
      let admin = false;
      if (user) {
        admin = user?.role == "admin";
      }
      res.send({ admin });
    });

    app.get("/users/volunteer/:email", verifyToken, async (req, res) => {
      const email = req.params.email;

      if (!email == req.user.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      // console.log(user);
      let Volunteer = false;
      if (user) {
        Volunteer = user?.role == "Volunteer";
      }
      res.send({ Volunteer });
    });

    app.post("/users", async (req, res) => {
      const userInfo = req.body;
      const query = { email: userInfo.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exist", insertedId: null });
      }
      const result = await usersCollection.insertOne(userInfo);
      res.send(result);
    });
    app.patch('/updateProfile/:id',async(req,res)=>{
      const data = req.body
      
      const id = req.params.id 
      const query ={_id: new ObjectId(id)} 
      const updateDoc ={
        $set:{
            name: data.name ,
            bloodGroup: data.blood,
            Avatar : data.photoUrl,
            District: data.district,
            upazila : data.upazila
        }
      }
      const result = await usersCollection.updateOne(query,updateDoc)
      res.send(result)
    })

    app.patch('/users/block/:id',verifyToken,verifyAdmin,async(req,res)=>{
      const id = req.params.id 
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: "Blocked",
        },
      };
      const result = await usersCollection.updateOne(query, updateDoc);
        res.send(result);
    })

    app.patch('/users/unblock/:id',verifyToken,verifyAdmin,async(req,res)=>{
      const id = req.params.id 
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: "Active",
        },
      };
      const result = await usersCollection.updateOne(query, updateDoc);
        res.send(result);
    })
    app.patch('/users/admin/:id',verifyToken,verifyAdmin,async(req,res)=>{
      const id = req.params.id 
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(query, updateDoc);
        res.send(result);
    })
    app.patch('/users/volunteer/:id',verifyToken,verifyAdmin,async(req,res)=>{
      const id = req.params.id 
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "Volunteer",
        },
      };
      const result = await usersCollection.updateOne(query, updateDoc);
        res.send(result);
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
