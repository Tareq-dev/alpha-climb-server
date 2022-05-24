const express = require("express");
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.STRIPE_SECRET);

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.68cho.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    await client.connect();
    const productCollection = client.db("alpha-climb").collection("products");
    const ordersCollection = client.db("alpha-climb").collection("orders");
    const paymentCollection = client.db("alpha-climb").collection("payment");
    const userCollection = client.db("alpha-climb").collection("profile");

    // GET == products
    app.get("/products", async (req, res) => {
      const query = {};
      const products = await productCollection.find(query).toArray();
      res.send(products);
    });

    // GET == single products
    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const product = await productCollection.findOne(query);
      res.send(product);
    });

    // POST for order
    app.post("/orders", async (req, res) => {
      const orders = req.body;
      const result = await ordersCollection.insertOne(orders);
      res.send(result);
    });
    // GET == orders
    app.get("/orders", async (req, res) => {
      const orders = await ordersCollection.find().toArray();
      res.send(orders);
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

    //Patch payment method
    app.patch("/products/:id", async (req, res) => {
      const id = req.params.id;
      const payment = req.body;
      const filter = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId,
        },
      };

      const result = await paymentCollection.insertOne(payment);
      const updatedOrder = await productCollection.updateOne(
        filter,
        updatedDoc
      );
      res.send(updatedDoc);
    });
    // GET ==Payment
    app.get("/payment/:id", async (req, res) => {
      const paymentId = req.params.id;
      const query = { paymentId: paymentId };
      const payment = await paymentCollection.findOne(query);
      res.send(payment);
    });
    //User profile update API

    app.post("/user/profile", async (req, res) => {
      const profile = req.body;
      const result = await userCollection.insertOne(profile);
      res.send(result);
    });

    // GET user profile
    app.get("/user/profile/:email", async (req, res) => {
      const email = req.params.email;
      const profile = await userCollection.find({ email: email }).toArray();
      res.send(profile);
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
