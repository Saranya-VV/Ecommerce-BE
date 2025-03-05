const express = require("express");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const port = process.env.PORT;
const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

app.get("/", (req, res) => {
  res.send("server is running");
});

// app.post("/pay", async (req, res) => {
//   try {
//     const { items, email } = req.body;

//     if (!Array.isArray(items) || items.length === 0) {
//       return res.status(400).json({ message: "No items provided in the payload." });
//     }

//     // Map over items to format them for Stripe's `line_items`
//     const extractingItems = items.map((item) => ({
//       quantity: item.quantity, 
//       price_data: {
//         currency: "usd",
//         unit_amount: Math.round(item.price * 100), // Ensure price is in cents and rounded correctly
//         product_data: {
//           name: item.title,
//           description: item.description,
//           images: [item.image], 
//         },
//       },
//     }));

//     // Create the Stripe session with the formatted items
//     const session = await stripe.checkout.sessions.create({
//       payment_method_types: ["card"],
//       line_items: extractingItems,
//       mode: "payment",
//       success_url: `http://localhost:5173/success?session_id={CHECKOUT_SESSION_ID}`,
//       cancel_url: `http://localhost:5173/cancel`,
//       metadata: {
//         email, // Add the user's email to the session metadata
//         payment_date: new Date().toISOString(), // Adding payment date to metadata

//       },
//     });

//     // Send the session ID back to the client
//     res.send({
//       message: "Stripe session created successfully.",
//       success: true,
//       id: session.id, 
//       session:session

//     });

//   } catch (error) {
//     console.error("Error during payment processing:", error.message);
//     res.status(500).json({ message: "Internal Server Error", error: error.message });
//   }
// });  

// app.get("/order-summary/:sessionId", async (req, res) => {
//   const { sessionId } = req.params;

//   try {
//     const lineItems = await stripe.checkout.sessions.listLineItems(sessionId);
//     res.json({ success: true, lineItems });
//   } catch (error) {
//     console.error("Error fetching line items:", error.message);
//     res.status(500).json({ message: "Error fetching line items", error: error.message });
//   }
// });


// Mock users database

// Mock orders database (in-memory storage for demonstration purposes)
let orders = [];

// Modify the /pay route to store the order details
app.post("/pay", async (req, res) => {
  try {
    const { items, email, userId } = req.body; // Adding userId to the request body

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "No items provided in the payload." });
    }

    // Map over items to format them for Stripe's `line_items`
    const extractingItems = items.map((item) => ({
      quantity: item.quantity, 
      price_data: {
        currency: "usd",
        unit_amount: Math.round(item.price * 100), // Ensure price is in cents and rounded correctly
        product_data: {
          name: item.title,
          description: item.description,
          images: [item.image], 
        },
      },
    }));

    // Create the Stripe session with the formatted items
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: extractingItems,
      mode: "payment",
      success_url: `http://localhost:5173/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `http://localhost:5173/cancel`,
      metadata: {
        email, // Add the user's email to the session metadata
        payment_date: new Date().toISOString(), // Adding payment date to metadata
      },
    });

    // Store the order in the mock database (you would typically store this in a real database)
    orders.push({
      sessionId: session.id,
      userId,
      email,
      lineItems: extractingItems,
      payment_status: session.payment_status,
      totalAmount: session.amount_total,
      createdAt: new Date().toISOString(),
    });

    // Send the session ID back to the client
    res.send({
      message: "Stripe session created successfully.",
      success: true,
      id: session.id,
      session,
      orders
    });

  } catch (error) {
    console.error("Error during payment processing:", error.message);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
});

// New route to fetch all orders for a given user
app.get("/order-summary/user/:userId", (req, res) => {
  const { userId } = req.params;

  try {
    // Filter orders by userId
    const userOrders = orders.filter(order => order.userId === userId);

    if (userOrders.length === 0) {
      return res.status(404).json({ message: "No orders found for the user." });
    }

    res.json({ success: true, orders: userOrders });
  } catch (error) {
    console.error("Error fetching user orders:", error.message);
    res.status(500).json({ message: "Error fetching user orders", error: error.message });
  }
});

// Example route to fetch a single order's line items by session ID (if needed)
app.get("/order-summary/:sessionId", async (req, res) => {
  const { sessionId } = req.params;

  try {
    const lineItems = await stripe.checkout.sessions.listLineItems(sessionId);
    res.json({ success: true, lineItems });
  } catch (error) {
    console.error("Error fetching line items:", error.message);
    res.status(500).json({ message: "Error fetching line items", error: error.message });
  }
});


let users = [];



// Login API
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const user = users.find(
    (u) => u.username === username && u.password === password
  );

  if (!user) {
    return res.status(401).json({ message: "Invalid username or password" });
  }

  res.json({ token: user.token });
});


// Registration API (with name, email, phone, and address)
app.post("/api/register", (req, res) => {
  const { username, password, email, phone, address, name } = req.body;
  const userExists = users.find((user) => user.username === username);

  if (userExists) {
    return res.status(400).json({ message: "User already exists" });
  }

  const newUser = {
    id: users.length + 1,
    username,
    password,
    token: `fake-jwt-token-${username}`,
    email,
    phone,
    address,
    name,
  };

  users.push(newUser);
  res.json({ token: newUser.token });
});

// Get user details API
app.get("/api/user-details", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1]; // Extract token from Authorization header
  const user = users.find((u) => u.token === token);

  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Return all user details
  res.json({ id: user.id, username: user.username, name: user.name, email: user.email, phone: user.phone, address: user.address });
});

// Update user details API
app.put("/api/update-user", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  const { username, email, phone, address, name } = req.body;
  const user = users.find((u) => u.token === token);

  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Update user details
  user.name = name;
  user.email = email;
  user.phone = phone;
  user.address = address;

  res.json({ message: "User details updated successfully" });
});

app.listen(port, () => {
  console.log(`Server is running on Port ${port}`);
});


