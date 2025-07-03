import { NextResponse } from 'next/server';
import { invalidateSettingsCache } from '@/lib/settings-helper';

export async function POST() {
  try {
    // Clear your SettingsManager cache
    invalidateSettingsCache();
    console.log('🗑️ Server-side settings cache cleared');
    
    return NextResponse.json({
      success: true,
      message: 'Settings cache cleared'
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}