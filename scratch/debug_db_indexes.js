const { MongoClient } = require('mongodb');

async function main() {
  const uri = "mongodb+srv://rajica810_db_user:ashokca810@cluster0.s2ieiex.mongodb.net/?appName=Cluster0";
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('yellowsingam_epaper');
    const collection = db.collection('editions');
    
    const mockEdition = {
      name: "Andhrapatrika ONG MAIN EDITION Telugu Daily - May 25 2026",
      alias: "andhrapatrika-ong-main-edition-telugu-daily-may-25-2026-test",
      date: new Date("2026-05-25T07:10:00.000Z"),
      metaTitle: "Andhrapatrika ONG MAIN EDITION Telugu Daily - May 25 2026",
      metaDescription: "Read todays...",
      category: "main",
      status: "published",
      uploadType: "pdf",
      pages: [
        {
          filename: "page_1.webp",
          url: "/api/media/editions/andhrapatrika-ong-main-edition-telugu-daily-may-25-2026/page_1.webp",
          previewFilename: "page_1_thumb.webp",
          previewUrl: "/api/media/editions/andhrapatrika-ong-main-edition-telugu-daily-may-25-2026/page_1_thumb.webp",
          pageNum: 1
        }
      ],
      pageCount: 1,
      views: 0,
      downloads: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log("Attempting insertOne...");
    const result = await collection.insertOne(mockEdition);
    console.log("Success! Inserted ID:", result.insertedId);

    // Clean it up
    await collection.deleteOne({ _id: result.insertedId });
    console.log("Cleaned up successfully!");
  } catch (err) {
    console.error("Error during insertion:", err);
  } finally {
    await client.close();
  }
}

main();
