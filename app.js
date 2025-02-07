require('dotenv').config();
const https = require('https');
const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require("cors");
const bodyParser = require('body-parser');
const fs = require('fs');
const connectDB = require("./Database/mongoconnect");
const User = require("./Database/Models/UserModel");
const Otel = require("./Database/Models/OtelModel");
const Ticket = require("./Database/Models/TicketModel");
const bcrypt = require("bcrypt");
const moment = require('moment');
const app = express();
const PORT = 4000;
const uploadDir = path.join(__dirname, 'public', 'uploads');
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const cron = require('node-cron');
connectDB(process.env.MONGODB_URI);
const options = {
    key: fs.readFileSync('./Keys/127.0.0.1+1-key.pem'),
    cert: fs.readFileSync('./Keys/127.0.0.1+1.pem'),
  };
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
const sendEmail = async (userEmail, tickets) => {
    const token = jwt.sign({ email: userEmail }, process.env.JWT_SECRET);
  
    const tableRows = tickets.map((ticket) => `
      <tr>
        <td>${ticket.customerId}</td>
        <td>${ticket.OtelName}</td>
        <td>${ticket.employeeName}</td>
        <td>${new Date(ticket.Date).toLocaleDateString()}</td>
        <td><a href="http://localhost:3000/editticket/${ticket._id}?token=${token}">Details</a></td>
      </tr>
    `).join("");
  
    const emailContent = `
      <table border="1" style="border-collapse: collapse; width: 100%;">
        <thead>
          <tr>
            <th>Ticket ID</th>
            <th>Otel İsmi</th>
            <th>Müşteri İsmi</th>
            <th>Tarih</th>
            <th>Görüntüle</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    `;
  
  
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: userEmail,
      subject: "Bugünkü Ticketlar",
      html: emailContent
    });
  
    console.log("Mail gönderildi!");
  };
cron.schedule('0 12 * * *', async() => {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)); 
    const endOfDay = new Date(today.setHours(12, 0, 0, 0));
    const tickets = await Ticket.find({
        Date: { $gte: startOfDay, $lte: endOfDay }
      });
      sendEmail("emrcinar@gmail.com" , tickets)
  });
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

app.use(cors({
    origin: 'https://localhost:3000', 
    methods: 'GET,POST,PUT,DELETE', 
}));
app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));


const apiKeyMiddleware = (req, res, next) => {
    const expectedApiKey = process.env.API_KEY;
    const clientApiKey = req.headers["x-api-key"]; 

    if (!clientApiKey || clientApiKey !== expectedApiKey) {
        console.log("İzinsiz giriş");
        return res.status(403).json({ message: "Yetkisiz erişim: Geçersiz API Key" });
    }
    next();
};
app.use(apiKeyMiddleware); 


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); 
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname)); 
    }
});
const upload = multer({ storage: storage });




app.post("/createadmin" , async(req,res) =>{
    try{
        await User.create({
            email : req.body.email,
            password : req.body.password,
            userrole : req.body.userrole
        })
        res.json({message: "kayıt başarılı"})
    }
    catch(error){
        console.log(error);
    }
})
app.post("/createcustomer" , async(req,res) =>{
    try{
        await User.create({
            email : req.body.email,
            password : req.body.password,
            namesurname: req.body.namesurname,
            hotelid : req.body.hotelid,
            userrole : req.body.userrole
        })
        res.json({message: "kayıt başarılı"})
    }
    catch(error){
        console.log(error);
    }
})
app.get("/getticketsuser/:id" , async(req,res) =>{
    try{
        const id = req.params.id;
        const user = await User.findById(id);
        const alltickets = await Ticket.find({
            _id: { $in: user.usertickets } 
        });
        res.json({tickets : alltickets})
    }
    catch(error){
        console.log(error);
    }
})
app.post("/signin" , async(req,res) =>{
    try{
        const user = await User.findOne({
            email : req.body.email
        })
        if(!user){
            return res.json({message: "email yok"});
        }
        const compare = await bcrypt.compare(req.body.password, user.password)
        if(!compare){
            return res.json({message: "parola eşleşmiyor"});
        }
        res.json({message: "onaylandı" , user: user})

    }
    catch(error){
        console.log(error);
    }
})
app.post("/saveotel" , async(req,res) =>{
    try{
        const hotel = req.body;

        let uniqueNumber;
        let isUnique = false;
    
        while (!isUnique) {
          uniqueNumber = Math.floor(Math.random() * 90) + 10; 
          const existingHotel = await Otel.findOne({ OtelNumber: uniqueNumber });
          if (!existingHotel) {
            isUnique = true;
          }
        }
    
        const newHotel = await Otel.create({
          OtelName: hotel.HotelName,
          OtelAdress: hotel.HotelAdress,
          OtelTel: hotel.HotelTel,
          OtelNumber: uniqueNumber,
          priceList: hotel.pricelist,
        });
    
        res.status(201).json({ message: "başarılı", hotel: newHotel });
    }
    catch(error){
        console.log(error)
        res.json({message: "başarısız"});
    }
})
app.get("/gethotels" , async(req,res) =>{
    try{
        const AllHotels = await Otel.find();
        res.json({HotelList : AllHotels})
    }
    catch(error){
        console.log(error);
    }
})
app.get("/gethotel/:id" , async(req,res) =>{
    try{
        const Hotel = await Otel.findById(req.params.id);
        res.json({HotelName: Hotel.OtelName , PriceList : Hotel.priceList, HotelAdress: Hotel.OtelAdress, HotelTel : Hotel.OtelTel})
    }
    catch(error){
        console.log(error);
    }
})
app.post("/updatehotel/:id" , async(req,res) =>{
    try{
        const id = req.params.id
        const hotel = req.body;
        await Otel.findByIdAndUpdate(id ,{
            OtelName: hotel.HotelName,
            OtelAdress: hotel.HotelAdress,
            priceList: hotel.pricelist,
            OtelTel: hotel.HotelTel
        })
        .then((result) => {
            res.status(201).json({ message: "başarılı"});
        })
        .catch((error) => {
            res.status(500).json({ message: "Güncelleme başarısız" });
        });
    }
    catch(error){
        console.log(error)
        res.json({message: "başarısız"});
    }
});
app.post("/createticket", upload.single("Photo"), async (req, res) => {
    const ticket = req.body;
    const parsedItemList = JSON.parse(ticket.itemlist);
    const otelNumber = ticket.OtelNumber;
    const user = JSON.parse(req.body.user);

    if (!otelNumber || otelNumber < 10 || otelNumber > 99) {
      return res.status(400).json({ message: "Geçersiz otel numarası" });
    }

    let customerId;
    let isUnique = false;

    while (!isUnique) {
      const randomPart = Math.floor(1000 + Math.random() * 9000); 
      customerId = `${otelNumber}${randomPart}`; 
      const existingTicket = await Ticket.findOne({ customerId: customerId });
      if (!existingTicket) {
        isUnique = true;
      }
    }
    const otel = await Otel.findOne({
        OtelName: ticket.otelname
    })

    try {
        const ticketData = {
            OtelName: ticket.otelname,
            OtelTel:  otel.OtelTel,
            itemList: parsedItemList,
            employeeName: ticket.employee,
            customerId: customerId,
            Date: ticket.date,
            Notes: ticket.notes,
        };

        if (req.file) {
            ticketData.file = req.file.filename;
        }

        const newticket = await Ticket.create(ticketData)
            if (user.userrole === 1) {
                await User.findByIdAndUpdate(user._id, {
                    $push: { usertickets: newticket._id }  
                });
            }
            res.status(201).json({ message: "Başarılı" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Sunucu hatası" });
    }
});
app.get("/gettickets" , async(req,res)=>{
    try{
        const Tickets = await Ticket.find();
        res.json({tickets : Tickets})
    }
    catch(error){
        console.log(error)
    }
})
app.get("/getticket/:id", async (req, res) => {
    try {
        const ticketid = req.params.id;
        const findticket = await Ticket.findById(ticketid);

        if (!findticket) {
            return res.status(404).json({ message: "Ticket bulunamadı" });
        }
        if (!findticket.file) {
            return res.status(200).json({
                ticket: findticket,
                image: null, 
            });
        }

        const imagePath = path.join(__dirname, 'public', 'uploads', findticket.file);

        if (fs.existsSync(imagePath)) {
            const imageBuffer = fs.readFileSync(imagePath);
            const base64Image = imageBuffer.toString('base64'); 
            return res.status(202).json({
                ticket: findticket,
                image: base64Image,
            });
        } else {
            return res.status(404).json({ message: "Resim dosyası bulunamadı", ticket: findticket });
        }
    } catch (error) {
        console.log("Hata:", error);
        return res.status(500).json({ message: "Bir hata oluştu", error });
    }
});
app.post("/printticket" , async(req,res) =>{
    try{
        const id = req.body.id;
        const ticket = await Ticket.findById(id);
        const date = ticket.Date;
        const day = ('0' + date.getDate()).slice(-2);  
        const month = ('0' + (date.getMonth() + 1)).slice(-2);  
        const year = ('0' + (date.getFullYear())).slice(-2);
    
        const formattedDate = `${day}/${month}`; 
        const formattedDateYear = `${day}/${month}/${year}`;
        const escposDataList = ticket.itemList.map((item, index) => {
            return (
                '\x1B\x40' +  // Initialize printer
                '\x1B\x61\x01' +  // Center align
                '\x1B\x45\x01' +  // Bold text on
                `${ticket.customerId}  TDY   ${formattedDate}\n` +
                `1 - ${ticket.employeeName}\n` +
                `${item.itemCount}pc ${item.itemName}\n` +
                `${index + 1} of ${ticket.itemList.length}  IN: ${formattedDateYear}  SVR: 15\n` +
                '\x1B\x45\x00' +  // Bold text off
                '\x1D\x56\x00'  // Cut command
            );
        });
        console.log(escposDataList)
        res.json({ escposData: escposDataList });
    }
    catch(error){
        console.log(error);
    }
})
app.post("/getpdf" , async(req,res) =>{
    const { Date, hotelId } = req.body;
    try{
        const otel = await Otel.findById(hotelId);
        const startDate = moment(Date, "YYYY-MM").startOf('month').toDate();
        const endDate = moment(Date, "YYYY-MM").endOf('month').toDate();
        const tickets = await Ticket.find({
            OtelName: otel.OtelName,
            Date: {
                $gte: startDate,
                $lte: endDate
            }
        });
        
        res.json({tickets : tickets , HotelAdress: otel.OtelAdress})
    }
    catch(error){
        console.log(error)
    }
})
app.post("/updateticket/:id", async (req, res) => {
    const id = req.params.id; 
    const updatedData = req.body; 
  
    try {
      const updatedTicket = await Ticket.findByIdAndUpdate(
        id, 
        { $set: updatedData }, 
        { new: true, runValidators: true } 
      );
  
      if (!updatedTicket) {
        return res.status(404).json({ message: "Bilet bulunamadı." });
      }
  
      res.status(200).json({
        message: "Bilet başarıyla güncellendi.",
        ticket: updatedTicket,
      });
    } catch (error) {
      console.error("Güncelleme sırasında hata oluştu:", error);
      res.status(500).json({
        message: "Bilet güncellenirken bir hata oluştu.",
        error,
      });
    }
  });
app.post("/deleteticket/:id" , async (req,res) =>{
    try{
        const ticket = await Ticket.findById(req.params.id);
        const filePath = path.join(__dirname, 'public', "uploads" , ticket.file);  
        fs.unlink(filePath, (err) => {
          if (err) {
            console.log("Dosya silinirken hata oluştu:", err);
            return res.status(500).json({ message: "Dosya silinemedi" });
          }})
        await Ticket.findByIdAndDelete(req.params.id);
        res.status(200).json({message: "Başarılı"})
    }
    catch(error){
        console.log(error);
        res.status(404).json({message: "Başarısız"});
    }
})
app.get("/homepage/:year" , async(req,res) =>{
    const dateParam = req.params.year;
    const targetDate = new Date(dateParam);
    const startOfDay = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999));
    const year = targetDate.getFullYear();
    const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
    const endOfYear = new Date(`${year}-12-31T23:59:59.999Z`);
    try{
        const monthlyItemCounts = await Ticket.aggregate([
            {
              $match: {
                Date: {
                  $gte: startOfYear,
                  $lte: endOfYear,
                },
              },
            },
            {
              $unwind: "$itemList", 
            },
            {
              $group: {
                _id: { month: { $month: "$Date" } }, 
                totalItemCount: { $sum: "$itemList.itemCount" }, 
              },
            },
            {
              $sort: { "_id.month": 1 }, 
            },
          ]);
          const dailyItemCounts = await Ticket.aggregate([
            {
              $match: {
                Date: {
                  $gte: startOfDay,
                  $lte: endOfDay,
                },
              },
            },
            {
              $unwind: "$itemList", 
            },
            {
              $group: {
                _id: { day: { $dayOfMonth: "$Date" } }, 
                totalItemCount: { $sum: "$itemList.itemCount" }, 
              },
            }
          ]);
          res.json({AllTickets: monthlyItemCounts , DayTickets : dailyItemCounts});
    }
    catch(error){
        console.log(error)
    }
})
app.post("/request-password-reset" , async(req,res) =>{
    const email = req.body.email
    try{
        const user = await User.findOne({email: email});
        if(!user){
            return res.json({message : "kullanıcı bulunamadı"});
        }
        const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });
        const resetLink = `http://localhost:3000/reset-password/${token}`;
        transporter.sendMail(
            {
              from: process.env.EMAIL_USER,
              to: email,
              subject: 'Reset Password',
              text: `Reset Password Link: ${resetLink}`,
            },
            (err, info) => {
              if (err) {
                console.log(err);
                return res.status(500).send('E-posta gönderilirken hata oluştu.');
              }
              res.json({message : "Email has been sended"});
            }
          );
    }
    catch(error){
        console.log(error);
    }
})
app.post('/reset-password/:token', async (req, res) => {
    const { token } = req.params;
    const { Password } = req.body;
  
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const hashedPassword = await bcrypt.hash(Password, 10);
      await User.findOneAndUpdate({email : decoded.email} , {
        password: hashedPassword
      })
      .then(res.json({message:"Başarılı"}));
    } catch (err) {
      res.status(400).send('Geçersiz veya süresi dolmuş token.');
    }
  });
  app.get("/sendmail" , async(req,res) =>{
    try{
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()); 
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        const tickets = await Ticket.find({
            Date: { $gte: startOfDay, $lte: endOfDay }
          });
          sendEmail("emrcinar@gmail.com" , tickets)
          .then(res.json({message: "Başarılı"}));
    }
    catch(error){
        console.log(error)
    }
  })
  app.post("/verify-token", (req, res) => {
    const { token } = req.body;
  
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      res.json({ valid: true, email: decoded.email });
    } catch (err) {
      res.status(401).json({ valid: false, message: "Geçersiz token" });
    }
  });
  https.createServer(options, app).listen(443, () => {
    console.log('HTTPS server is running on https://localhost');
  });