const express = require("express");
require("./db/conn");
const app = express();
const mongoose = require("mongoose");
const Restaurant = require("./models/restaurant");
const tableSchema = require("./models/Table");
const menuSchema = require("./models/MenuItem");
const Order = require("./models/item");
const bcrypt = require("bcrypt");
const LoginModel = require("./models/config");
const path = require("path");
const bodyParser = require("body-parser");
const ejsMate = require("ejs-Mate");
const methodOverride = require("method-override");
const session = require("express-session");
const deleteItem = require("./models/deletedItem");
const dotenv = require("dotenv");
const nodemailer = require("nodemailer");
const multer = require("multer");

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.set(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.engine("ejs", ejsMate);
app.use(methodOverride("_method"));
app.use(express.static("public", { maxAge: 0 }));
app.use(
  session({
    secret: "yourSecretKey",
    resave: false,
    saveUninitialized: false,
  })
);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads/"); // Save uploaded files to uploads folder
  },
  filename: function (req, file, cb) {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

const upload = multer({ storage: storage });

// OTP verification section
// OTP generation
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Nodemailer configuration
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: "campusbitesotp@gmail.com",
    pass: "nwsn yzkb uvcm rkho",
  },
});

// Post route to handle otp verification
// Send OTP route
app.post("/send-otp", (req, res) => {
  const email = req.body.email;
  const otp = generateOTP();
  req.session.otp = otp;
  req.session.email = email;

  const mailOptions = {
    from: '"CampusBites" <campusbitesotp@gmail.com>',
    to: email,
    subject: "Your OTP Code",
    text: `Your OTP code for ${email} is ${otp}`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
      return res.status(500).send("Error sending OTP!");
    }
    res.send("OTP sent");
  });
});

// Verify otp route
app.post("/verify-otp", (req, res) => {
  const userOtp = req.body.otp;
  if (userOtp == req.session.otp) {
    res.send({ verified: true });
  } else {
    res.send({ verified: false });
  }
});

// Get route for otp sending and verifying
app.get("/otp", (req, res) => {
  res.render("generate-otp/index");
});

app.get("/", (req, res) => {
  res.render("root/home");
});

app.get("/login", (req, res) => {
  res.render("loginviews/login.ejs");
});

app.get("/signup", (req, res) => {
  res.render("loginviews/signup");
});

app.post("/signup", async (req, res) => {
  const data = {
    name: req.body.username,
    email: req.body.email,
    mobile: req.body.mobile,
    password: req.body.password,
  };

  const existinguser = await LoginModel.findOne({ name: data.name });
  if (existinguser) {
    res.send("User already exist Please choose a different username");
  } else {
    const saltRounds = 10; // Number of salt round for bcrypt
    const hashedPassword = await bcrypt.hash(data.password, saltRounds);
    data.password = hashedPassword; //Repalce the hashpassword with origin

    const userdata = await LoginModel.create(data);
    console.log(userdata);
    res.render("restaurant/landing-page");
  }
});

//login user
app.post("/login", async (req, res) => {
  try {
    const check = await LoginModel.findOne({ name: req.body.username });
    if (!check) {
      res.send("user cannot found");
    }

    const isPasswordMatch = await bcrypt.compare(
      req.body.password,
      check.password
    );
    if (isPasswordMatch) {
      res.render("restaurant/landing-page");
    } else {
      res.send("wrong password");
    }
  } catch (err) {
    res.send("wrong details");
    console.log(err);
  }
});

app.get("/restaurant/create-rest", async (req, res) => {
  res.render("restaurant/create-restaurant.ejs");
});

app.post("/restaurant/create-rest", async (req, res) => {
  console.log("Boo!!");
  const restName = req.body.name;
  console.log("Rest Name:", restName);
  lastRest = await Restaurant.find().sort({ restId: "desc" }).limit(1);
  const newRestId = ++lastRest[0].restId;
  restaurant = new Restaurant({
    restId: newRestId,
    name: restName,
    tables: [],
    menu: [],
  });
  restaurant.save();
  res.redirect("/restaurant/" + newRestId + "/tables/add");
});

app.get("/restaurant/:restId/tables/add", async (req, res) => {
  let restId = req.params.restId;
  console.log(restId);
  res.render("restaurant/add-table.ejs", { restId });
});

app.post("/restaurant/:restId/tables/add", async (req, res) => {
  let numberOfTables = parseInt(req.body.number);
  let restId = parseInt(req.params.restId);
  let tables = [];
  for (let i = 1; i < numberOfTables + 1; i++) {
    tables.push({ number: i });
  }
  const filter = { restId: restId };
  const update = { tables: tables };
  let restaurant = await Restaurant.findOneAndUpdate(filter, update);
  res.redirect("/restaurant/ " + restId + "/menu/add");
});

app.get("/restaurant/:restId/menu/add", async (req, res) => {
  const restId = req.params.restId;
  const message = req.query.message;
  res.render("restaurant/add-menu.ejs", { restId, message });
});

app.post(
  "/restaurant/:restId/menu/add",
  upload.single("menuImage"),
  async (req, res) => {
    const restId = parseInt(req.params.restId);
    const menuName = req.body.menuName;
    const menuPrice = parseInt(req.body.menuPrice);
    const uploadedImage = req.file; // Access the uploaded image file

    if (menuName.length === 0 || isNaN(menuPrice)) {
      return res.redirect("/restaurant/" + restId + "/menu/add");
    }

    const filter = { restId: restId };
    let restaurant = await Restaurant.findOne(filter);

    if (!restaurant) {
      return res.status(404).send("Restaurant not found");
    }

    let menus = restaurant.menu;
    menus.push({
      name: menuName,
      price: menuPrice,
      image: uploadedImage.filename,
    });

    const update = { menu: menus };
    await Restaurant.findOneAndUpdate(filter, update);

    res.redirect("/restaurant/" + restId + "/menu/add?message=" + menuName);
  }
);

app.get("/restaurant/:restId/menu/add", (req, res) => {
  const restId = parseInt(req.params.restId);
  res.render("restaurant/add-menu", { restId });
});

app.get("/restaurant/:restId/dashboard", async (req, res) => {
  const restId = parseInt(req.params.restId);
  const filter = { restId: restId, is_complete: false };
  const openOrders = await Order.find(filter);
  res.render("restaurant/dashboard.ejs", { restId, openOrders });
});

app.get("/restaurant/:restId/dashboard/order-history", async (req, res) => {
  const restId = parseInt(req.params.restId);
  const filter = { restId: restId };
  const completedOrders = await deleteItem.find(filter);
  res.render("restaurant/order-history.ejs", { restId, completedOrders });
});

app.post("/restaurant/:restId/dashboard/order-processed", async (req, res) => {
  const restId = parseInt(req.params.restId);
  const orderId = req.body.orderId;
  const filter = { restId: restId, _id: orderId };
  const update = { is_complete: true };
  await Order.findOneAndUpdate(filter, update);
  res.redirect("/restaurant/" + restId + "/dashboard");
});

app.get("/restaurant/:restId/dashboard/menus", async (req, res) => {
  const restId = parseInt(req.params.restId);
  const filter = { restId: restId };
  const restaurant = await Restaurant.findOne(filter);
  const menus = restaurant.menu;
  res.render("restaurant/dashboard-menus.ejs", { restId, menus });
});

app.delete("/restaurant/:restId/dashboard/menus/:menuId", async (req, res) => {
  console.log("helo");
  try {
    const menuId = req.params.menuId;
    const restId = req.params.restId;
    console.log(restId);
    const restaurant = await Restaurant.findOne({ restId: restId });
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    } else {
      const menuItemIndex = restaurant.menu.findIndex(
        (menuItem) => menuItem._id.toString() === menuId
      );

      if (menuItemIndex === -1) {
        console.log("Menu item not found");
        return;
      }

      restaurant.menu.splice(menuItemIndex, 1);
      restaurant.save();
      return res.redirect("/restaurant/" + restId + "/dashboard/menus");
    }
  } catch (error) {
    console.error("Error deleting menu:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/dineat/:restId/tables", async (req, res) => {
  const restId = parseInt(req.params.restId);
  const filter = { restId: restId };
  const restaurant = await Restaurant.findOne(filter);
  const tables = restaurant.tables;
  console.log(restaurant);
  res.render("dine-at/list-tables.ejs", { restId, tables });
});

app.get("/dineat/:restId/table/:tableNumber/create-order", async (req, res) => {
  const restId = parseInt(req.params.restId);
  const tableNum = parseInt(req.params.tableNumber);
  const filter = { restId: restId };
  const restaurant = await Restaurant.findOne(filter);
  const menus = restaurant.menu;
  res.render("dine-at/create-order.ejs", {
    restId: restId,
    tableNum: tableNum,
    menus: menus,
  });
});

app.post(
  "/dineat/:restId/table/:tableNumber/create-order",
  async (req, res) => {
    const orderedMenu = req.body;
    const restId = parseInt(req.params.restId);
    const tableNum = parseInt(req.params.tableNumber);
    const filter = { restId: restId };
    const restaurant = await Restaurant.findOne(filter);
    const menus = restaurant.menu;
    let items = [];
    let totalPayable = 0;
    for (const menuId in orderedMenu) {
      let qty = parseInt(orderedMenu[menuId]);
      for (_menu of menus) {
        if (_menu._id == menuId) {
          items.push({
            menuId: menuId,
            menuName: _menu.name,
            menuPrice: _menu.price,
            menuImage: _menu.image,
            qty: qty,
          });
          totalPayable += qty * _menu.price;
          break;
        }
      }
    }

    const order = new Order({
      restId: restId,
      tableNumber: tableNum,
      items: items,
      is_complete: false,
      totalPayable: totalPayable,
    });
    order.save();

    orderSummary = [];
    for (item of items) {
      orderSummary.push({
        menuId: item.menuId,
        menuName: item.menuName,
        menuPrice: item.menuPrice,
        menuImage: item.menuImage,
        qty: item.qty,
        subtotal: item.menuPrice * item.qty,
      });
    }
    res.render("dine-at/userorder.ejs", {
      restId,
      orderSummary,
      totalPayable,
      tableNum,
    });
  }
);

app.get("/dineat/:restId/table/:tableNumber/update-order", async (req, res) => {
  const restId = parseInt(req.params.restId);
  const tableNum = parseInt(req.params.tableNumber);
  const filter = { restId: restId, tableNumber: tableNum };
  try {
    const restaurant = await Restaurant.findOne({ restId: restId });
    const menus = restaurant.menu;
    // console.log("This is restaurant:  " + menus);
    const orders = await Order.findOne(filter);
    // console.log("Orders: " + orders);
    const ord = orders.items;
    // console.log(menus);
    res.render("dine-at/updatemenu.ejs", {
      ord,
      restId,
      tableNum,
      menus,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.post(
  "/dineat/:restId/table/:tableNumber/update-order1",
  async (req, res) => {
    const orderedMenu = req.body;
    const restId = parseInt(req.params.restId);
    const tableNum = parseInt(req.params.tableNumber);
    const filter = { restId: restId, tableNumber: tableNum };
    // console.log(orderedMenu);
    const order = await Order.findOne(filter);
    if (!order) {
      console.log("Order not found");
    }

    for (const itemName in orderedMenu) {
      const quantity = parseInt(orderedMenu[itemName]);
      console.log(order);
      const existingItem = order.items.find(
        (item) => item.menuName === itemName
      );
      if (existingItem) {
        existingItem.qty = quantity;
      }
    }

    const updatedOrder = await order.save();
    const orderSummary = updatedOrder.items;
    console.log(orderSummary);
    res.render("dine-at/userorder.ejs", { restId, orderSummary, tableNum });
  }
);
app.get("/dineat/:restId/table/:tableNumber/final-order", async (req, res) => {
  const restId = parseInt(req.params.restId);
  const tableNum = parseInt(req.params.tableNumber);
  const filter = { restId: restId, tableNumber: tableNum };
  try {
    const restaurant = await Restaurant.findOne({ restId: restId });
    const allMenu = restaurant.menu;
    const orders = await Order.findOne(filter);
    // console.log(orders);
    const ord = orders.items;
    // console.log(ord);
    res.render("dine-at/finalorder.ejs", { ord, restId, tableNum });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).send("Error fetching orders. Order food!");
  }
});

app.get("/dashboard/restId/:restId/tablenum/:tableNumber", async (req, res) => {
  return res.redirect("/restaurant/" + restId + "/dashboard");
});

app.post(
  "/dashboard/restId/:restId/tablenum/:tableNumber",
  async (req, res) => {
    const restId = parseInt(req.params.restId);
    const tableNum = parseInt(req.params.tableNumber);

    const responce = await Order.findOneAndDelete({
      restId: restId,
      tableNumber: tableNum,
    });

    if (responce) {
      console.log(responce);
      const items = responce.items;
      const newItem = await deleteItem({
        restId: restId,
        tableNumber: tableNum,
        items: items,
        is_complete: false,
      });

      newItem
        .save()
        .then((savedMenuItem) => {
          console.log("Menu item saved successfully:", savedMenuItem);
          return res.redirect("/restaurant/" + restId + "/dashboard");
        })
        .catch((error) => {
          console.error("Error saving menu item:", error);
        });
    }
  }
);

app.get("/foodie", async (req, res) => {
  const data = {
    restId: 101,
    name: "rest1",
    tables: [{ name: "abc", number: 1 }],
    menu: [{ name: "xyz", price: 30 }],
  };
  const data1 = new Restaurant(data);
  await data1.save().then(console.log("successfull stored"));
  console.log(data1);
  res.send("DONE");
});

app.get("/", (req, res) => {
  res.send("Hey There!!");
});

app.get("/restaurant/:restId/dashboard/contact-us", (req, res) => {
  const restId = parseInt(req.params.restId);
  res.render("restaurant/contact-us", { restId });
});
app.get("/about-us", (req, res) => {
  const restId = parseInt(req.params.restId);
  res.render("restaurant/about-us", { restId });
});

app.listen(3000, () => {
  console.log("server is listning port in 3000");
});
