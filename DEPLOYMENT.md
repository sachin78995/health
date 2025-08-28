# 🚀 HealthGuard AI - Render Deployment Guide

## 📋 **What We've Done:**
✅ **Combined Frontend + Backend** into single server
✅ **Updated API URLs** to work with combined deployment
✅ **Added static file serving** for frontend

## 🎯 **Deploy to Render (Single Service):**

### **1. Create New Web Service on Render:**
- Go to [render.com](https://render.com)
- Click "New +" → "Web Service"
- Connect your GitHub repository

### **2. Configure Service:**
- **Name**: `healthguard-ai`
- **Environment**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `node server.js`
- **Plan**: Free (or paid if you prefer)

### **3. Environment Variables:**
```
MONGO_URI=your_mongodb_atlas_connection_string_here
JWT_SECRET=your_super_secret_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

### **4. Deploy:**
- Click "Create Web Service"
- Render will automatically deploy your app
- Wait for build to complete (2-5 minutes)

## 🌐 **After Deployment:**
- **Frontend**: Available at your Render URL
- **Backend API**: Available at `your-url.com/api/*`
- **Everything works together** in one service!

## 🔧 **What Happens:**
1. **User visits** your Render URL
2. **Server serves** the React frontend (index.html, app.js, styles.css)
3. **Frontend makes API calls** to the same server
4. **Backend handles** authentication, database, etc.
5. **Single deployment** manages everything!

## 🎉 **Benefits:**
- ✅ **One deployment** for everything
- ✅ **No CORS issues** (same domain)
- ✅ **Simpler management**
- ✅ **Cost effective**
- ✅ **Easy to maintain**

## 🚨 **Important Notes:**
- **MongoDB Atlas** must allow connections from Render's IPs
- **Environment variables** must be set correctly
- **Build process** will install all dependencies

## 📞 **Need Help?**
- Check Render logs for any errors
- Ensure MongoDB connection string is correct
- Verify all environment variables are set

**Your HealthGuard AI will be live on Render in minutes!** 🚀
