import { requireSupabase } from './supabase';

export type FamilyRole = 'owner' | 'member';

export type Family = {
  id: string;
  name: string;
  inviteCode: string;
  /** Papel do usuário logado. */
  role: FamilyRole;
};

export type FamilyMemberInfo = {
  userId: string;
  displayName: string;
  role: FamilyRole;
  joinedAt: string;
};

export type MyFamily = { family: Family; members: FamilyMemberInfo[] };

function fail(error: { message: string } | null): void {
  if (error) {
    throw new Error(error.message);
  }
}

/** Dado de uma consulta que precisa existir. */
function required<T>(res: {
  data: T | null;
  error: { message: string } | null;
}): T {
  fail(res.error);
  if (res.data === null) {
    throw new Error('Registro não encontrado na nuvem.');
  }
  return res.data;
}

async function myUserId(): Promise<string> {
  const { data } = await requireSupabase().auth.getSession();
  const id = data.session?.user.id;
  if (!id) {
    throw new Error('Entre na sua conta para continuar.');
  }
  return id;
}

/** Família do usuário logado com os membros, ou null se não tiver família. */
export async function fetchMyFamily(): Promise<MyFamily | null> {
  const client = requireSupabase();
  const userId = await myUserId();

  const mine = await client
    .from('family_members')
    .select('family_id, role')
    .eq('user_id', userId)
    .maybeSingle();
  fail(mine.error);
  if (!mine.data) {
    return null;
  }

  const [familyRes, membersRes] = await Promise.all([
    client
      .from('families')
      .select('id, name, invite_code')
      .eq('id', mine.data.family_id)
      .single(),
    client
      .from('family_members')
      .select('user_id, role, joined_at')
      .eq('family_id', mine.data.family_id)
      .order('joined_at'),
  ]);
  const family = required(familyRes);
  fail(membersRes.error);

  const members = membersRes.data ?? [];
  const profiles = await client
    .from('profiles')
    .select('id, display_name')
    .in(
      'id',
      members.map(m => m.user_id),
    );
  fail(profiles.error);

  return {
    family: {
      id: family.id,
      name: family.name,
      inviteCode: family.invite_code,
      role: mine.data.role,
    },
    members: members.map(m => ({
      userId: m.user_id,
      displayName:
        profiles.data?.find(p => p.id === m.user_id)?.display_name ??
        'Sem nome',
      role: m.role,
      joinedAt: m.joined_at,
    })),
  };
}

export async function createFamily(name: string): Promise<void> {
  const { error } = await requireSupabase().rpc('create_family', {
    p_name: name,
  });
  fail(error);
}

export async function joinFamily(code: string): Promise<void> {
  const { error } = await requireSupabase().rpc('join_family', {
    p_code: code,
  });
  fail(error);
}

export async function leaveFamily(): Promise<void> {
  const { error } = await requireSupabase().rpc('leave_family');
  fail(error);
}

export async function regenerateInviteCode(): Promise<string> {
  const { data, error } = await requireSupabase().rpc('regenerate_invite_code');
  fail(error);
  return data as string;
}

export async function renameFamily(id: string, name: string): Promise<void> {
  const { error } = await requireSupabase()
    .from('families')
    .update({ name: name.trim(), updated_at: new Date().toISOString() })
    .eq('id', id);
  fail(error);
}

export type Profile = { id: string; displayName: string; email: string };

export async function fetchMyProfile(): Promise<Profile> {
  const client = requireSupabase();
  const { data: session } = await client.auth.getSession();
  const user = session.session?.user;
  if (!user) {
    throw new Error('Entre na sua conta para continuar.');
  }
  const { data, error } = await client
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .maybeSingle();
  fail(error);
  return {
    id: user.id,
    displayName: data?.display_name ?? '',
    email: user.email ?? '',
  };
}

export async function updateDisplayName(name: string): Promise<void> {
  const userId = await myUserId();
  const { error } = await requireSupabase()
    .from('profiles')
    .update({
      display_name: name.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
  fail(error);
}
