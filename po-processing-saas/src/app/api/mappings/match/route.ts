import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { matchPartNumber } from '@/lib/matching/match-engine';
import { validateBody } from '@/lib/validation/validate';
import { MatchRequestSchema } from '@/lib/validation/schemas';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's org for ownership check
    const { data: userProfile } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const validation = validateBody(MatchRequestSchema, body);
    if (!validation.success) return validation.response;
    const { vendor_part_number, manufacturer_part_number } = validation.data;

    // Only fetch mappings belonging to user's organization
    const { data: mappings } = await supabase
      .from('vendor_mappings')
      .select('*')
      .eq('organization_id', userProfile.organization_id);

    const match = matchPartNumber(
      vendor_part_number,
      manufacturer_part_number || null,
      mappings || []
    );

    return NextResponse.json({ match });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Match failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
