const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.STRIPE_SECRET);

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://alpha-climb-179:hJRHiWd6lOMdPvFQ@cluster0.68cho.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// function verifyToken(req, res, next) {
//   const authHeader = req.headers.authorization;
//   if (!authHeader) {
//     return res.status(401).send({ message: "UnAuthorized access" });
//   }
//   const secret = authHeader.split(" ")[1];
//   jwt.verify(secret, process.env.SECRET_KEY, function (err, decoded) {
//     if (err) {
//       return res.status(403).send({ message: "Forbidden access" });
//     }
//     req.decoded = decoded;
//     next();
//   });
// }

async function run() {
  try {
    await client.connect();
    const productCollection = client.db("alpha-climb").collection("products");
    const ordersCollection = client.db("alpha-climb").collection("orders");
    const paymentCollection = client.db("alpha-climb").collection("payment");
    const userCollection = client.db("alpha-climb").collection("user");
    const reviewCollection = client.db("alpha-climb").collection("reviews");

    // GET ADMIN

    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      res.send(user);
    });

    //Put USER

    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign({ email: email }, process.env.SECRET_KEY, {
        expiresIn: "2h",
      });
      res.send({ result, token });
    });

    // GET user
    app.get("/user",  async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    });

    //Delete Product

    app.delete("/user/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    // GET ADMIN
    app.get("/admin/:email",  async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user?.role === "admin";
      res.send({ admin: isAdmin });
    });

    // PUT Admin Role
    app.put("/user/admin/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updateDoc = {
        $set: { role: "admin" },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // GET == products
    app.get("/products", async (req, res) => {
      const query = {};
      const products = await productCollection.find(query).toArray();
      res.send(products);
    });

    // POST == products

    app.post("/products", async (req, res) => {
      const products = req.body;
      const result = await productCollection.insertOne(products);
      res.send(result);
    });

    // GET == single products
    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const product = await productCollection.findOne(query);
      res.send(product);
    });

    //Delete Product

    app.delete("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await productCollection.deleteOne(query);
      res.send(result);
    });
    // POST for order
    app.post("/orders", async (req, res) => {
      const orders = req.body;
      const result = await ordersCollection.insertOne(orders);
      res.send(result);
    });
    // GET == orders

    app.get("/orders",  async (req, res) => {
      const orders = await ordersCollection.find().toArray();
      res.send(orders);
    });

    // Order Delete

    app.delete("/orders/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await ordersCollection.deleteOne(query);
      res.send(result);
    });
    // GET == orders by email

    app.get("/orders/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const order = await ordersCollection.find(query).toArray();
      res.send(order);
    });

    // GET == orders by email and id
    app.get("/orders/:email/:id", async (req, res) => {
      const email = req.params.email;
      const productId = req.params.id;
      const query = { email: email, productId: productId };
      const order = await ordersCollection.find(query).toArray();
      res.send(order);
    });

    // GET == orders by id

    app.get("/orders/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const order = await ordersCollection.findOne(query);
      res.send(order);
    });

    //Delete order

    app.delete("/orders/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await ordersCollection.deleteOne(query);
      res.send(result);
    });

    // POST for order
    app.post("/reviews", async (req, res) => {
      const reviews = req.body;
      const result = await reviewCollection.insertOne(reviews);
      res.send(result);
    });

    app.get("/reviews", async (req, res) => {
      const reviews = await reviewCollection.find().toArray();
      res.send(reviews);
    });

    // POST Payment API
    app.post("/create-payment-intent", async (req, res) => {
      const product = req.body;
      const price = product.price;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({ clientSecret: paymentIntent.client_secret });
    });

    // Put method

    app.put("/order/:email/:id", async (req, res) => {
      email = req.params.email;
      const productId = req.params.id;
      const payment = req.body;
      const filter = { email: email, productId: payment.paymentId };
      const updatedDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId,
        },
      };
      const result = await paymentCollection.insertOne(payment);
      const updatedOrder = await ordersCollection.updateOne(filter, updatedDoc);
      res.send(updatedDoc);
    });

    // GET ==Payment
    app.get("/payment/:id", async (req, res) => {
      const paymentId = req.params.id;
      const query = { paymentId: paymentId };
      const payment = await paymentCollection.findOne(query);
      res.send(payment);
    });

    // PUT Admin Role
    app.patch("/admin/order/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const updateDoc = {
        $set: { Shipped: true },
      };
      const result = await ordersCollection.updateOne(filter, updateDoc);

      res.send(result);
    });
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Running Alpha");
});

app.listen(port, () => {
  console.log("Listening to port", port);
});
