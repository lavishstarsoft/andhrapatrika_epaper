import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';
import clientPromise from '@/lib/mongodb';

// Helper to slugify category name
function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// GET all categories
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('yellowsingam_epaper');

    let categories = await db.collection('categories').find({}).toArray();

    // Seed default categories if collection is empty
    if (categories.length === 0) {
      const defaultCategories = [
        {
          name: 'Main Edition',
          slug: 'main',
          description: 'Daily main newspaper edition',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          name: 'City Edition',
          slug: 'city',
          description: 'Local city news and updates',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          name: 'Sports Edition',
          slug: 'sports',
          description: 'Sports news and coverage',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          name: 'Business Edition',
          slug: 'business',
          description: 'Business and financial news',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await db.collection('categories').insertMany(defaultCategories);
      categories = await db.collection('categories').find({}).toArray();
    }

    // Get edition counts dynamically for each category
    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const editionCount = await db.collection('editions').countDocuments({
          category: category.slug,
        });

        return {
          ...category,
          _id: category._id.toString(),
          editionCount,
        };
      })
    );

    return NextResponse.json({ success: true, categories: categoriesWithCount });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

// POST new category
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Category name is required' },
        { status: 400 }
      );
    }

    const slug = slugify(name);

    const client = await clientPromise;
    const db = client.db('yellowsingam_epaper');

    // Check if category with same slug already exists
    const existingCategory = await db.collection('categories').findOne({ slug });
    if (existingCategory) {
      return NextResponse.json(
        { success: false, error: 'Category with this name or slug already exists' },
        { status: 400 }
      );
    }

    const newCategory = {
      name: name.trim(),
      slug,
      description: (description || '').trim(),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('categories').insertOne(newCategory);

    revalidateTag('home-data');
    revalidatePath('/');

    return NextResponse.json({
      success: true,
      message: 'Category created successfully',
      category: {
        ...newCategory,
        _id: result.insertedId.toString(),
        editionCount: 0,
      },
    });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create category' },
      { status: 500 }
    );
  }
}
