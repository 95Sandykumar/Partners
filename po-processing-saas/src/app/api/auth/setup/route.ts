import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { validateBody } from '@/lib/validation/validate';
import { AuthSetupSchema } from '@/lib/validation/schemas';

export async function POST(request: NextRequest) {
  try {
    // Authenticate the request - use the session user, NOT client-provided userId
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = validateBody(AuthSetupSchema, body);
    if (!validation.success) return validation.response;
    const { orgName, fullName } = validation.data;

    // Check if user already has a profile (prevent duplicate setup)
    const serviceClient = await createServiceClient();
    const { data: existingUser } = await serviceClient
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();

    if (existingUser) {
      return NextResponse.json({ error: 'Account already set up' }, { status: 409 });
    }

    // Create organization
    const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const { data: org, error: orgError } = await serviceClient
      .from('organizations')
      .insert({ name: orgName, slug: `${slug}-${Date.now()}` })
      .select()
      .single();

    if (orgError) throw orgError;

    // Create user profile using authenticated user's ID and email
    const { error: userError } = await serviceClient
      .from('users')
      .insert({
        id: user.id,
        organization_id: org.id,
        email: user.email!,
        full_name: fullName,
        role: 'admin',
      });

    if (userError) throw userError;

    return NextResponse.json({ success: true, organization_id: org.id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Setup failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
