import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';
import clientPromise from '@/lib/mongodb';
import { resolveMediaUrl } from '@/lib/r2';


export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('yellowsingam_epaper');

    let settings = await db.collection('settings').findOne({ type: 'global' });

    if (!settings) {
      // Default settings
      const newSettings = {
        type: 'global',
        siteName: 'Andhrapatrika Telugu Daily',
        tagline: '',
        siteUrl: 'https://andhrapatrikaa.com',
        email: 'contact@andhrapatrikaa.com',
        phone: '+91 9876543210',
        address: 'Vijayawada, Andhra Pradesh, India',
        timezone: 'Asia/Kolkata',
        language: 'te',
        primaryColor: '#1721d8',
        secondaryColor: '#2D2D2D',
        logoUrl: '',
        enableNotifications: true,
        enableAnalytics: true,
        enableWatermark: true,
        watermarkText: 'Andhrapatrika',
        pdfQuality: 'high',
        imageQuality: 'high',
        // Ad Settings
        adEnabled: false,
        adType: 'custom',
        googleAdCode: '',
        customAdImage: '',
        customAdLink: '',
        headerHeight: 56,
        footerHeight: 64,
      };
      await db.collection('settings').insertOne(newSettings);
      settings = newSettings as any;
    }

    if (settings) {
      settings.logoUrl = resolveMediaUrl(settings.logoUrl);
      settings.customAdImage = resolveMediaUrl(settings.customAdImage);
    }

    return NextResponse.json(
      { success: true, settings },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const client = await clientPromise;
    const db = client.db('yellowsingam_epaper');

    const updateData = { ...body };
    delete updateData._id;
    updateData.updatedAt = new Date();

    await db.collection('settings').updateOne(
      { type: 'global' },
      { $set: updateData },
      { upsert: true }
    );

    revalidateTag('home-data');
    revalidatePath('/');

    return NextResponse.json({ success: true, message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ success: false, error: 'Failed to update settings' }, { status: 500 });
  }
}
