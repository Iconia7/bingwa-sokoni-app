const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const PackageSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  amount: { type: Number, required: true },
  tokens: { type: Number, required: true },
  label: { type: String, required: true },
  icon: { type: String, required: true },
  isSubscription: { type: Boolean, default: false },
  durationDays: { type: Number, default: 0 },
});

const Package = mongoose.model('Package', PackageSchema, 'packages');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const subPkg = {
      id: "storefront_30_days",
      amount: 200,
      tokens: 0,
      label: "Online Storefront Access",
      icon: "storefront",
      isSubscription: true,
      durationDays: 30
    };

    await Package.updateOne({ id: subPkg.id }, { $set: subPkg }, { upsert: true });
    console.log('✅ Subscription package seeded successfully!');
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding database:', err);
    process.exit(1);
  }
}

seed();
