export async function getPlanAccess(supabase: any, planId: string, userId: string) {
  const { data: plan, error } = await supabase
    .from('plans')
    .select('*')
    .eq('id', planId)
    .single()

  if (error || !plan) {
    return { isAuthorized: false, isAdmin: false, plan: null }
  }

  let isAuthorized = plan.created_by === userId
  let isAdmin = plan.created_by === userId

  if (plan.group_id) {
    const { data: member } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', plan.group_id)
      .eq('user_id', userId)
      .single()

    if (member) {
      isAuthorized = true
      if (member.role === 'admin') {
        isAdmin = true
      }
    }
  }

  return { isAuthorized, isAdmin, plan }
}
