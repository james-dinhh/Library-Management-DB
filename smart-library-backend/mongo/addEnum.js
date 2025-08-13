// Script to update enums in MongoDB

import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();
const MONGO_URI = process.env.MONGO_URI;

const enums = {
  Role: ['reader', 'staff'],
  ActionType: ['add_book', 'update_book', 'retire_book'],
  BookStatus: ['active', 'retired']
};

const enumSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  values: { type: [String], required: true }
});
const EnumModel = mongoose.model('Enum', enumSchema);

async function updateEnums() {
  await mongoose.connect(MONGO_URI);
  for (const [name, values] of Object.entries(enums)) {
    await EnumModel.findOneAndUpdate(
      { name },
      { values },
      { upsert: true, new: true }
    );
    console.log(`Updated enum: ${name}`);
  }
  await mongoose.disconnect();
  console.log('All enums updated.');
}

updateEnums().catch(err => {
  console.error('Error updating enums:', err);
  process.exit(1);
});
