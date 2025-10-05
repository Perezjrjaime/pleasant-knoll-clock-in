// Test Supabase Connection
// Paste this in your browser console to test

// Test 1: Simple count query
console.log('Test 1: Count query...')
const { data: count, error: countError } = await supabase
  .from('user_roles')
  .select('*', { count: 'exact', head: true })

console.log('Count result:', count, countError)

// Test 2: Select all
console.log('Test 2: Select all...')
const { data: all, error: allError } = await supabase
  .from('user_roles')
  .select('*')

console.log('Select all result:', all, allError)

// Test 3: Select by user_id
console.log('Test 3: Select by user_id...')
const { data: byId, error: byIdError } = await supabase
  .from('user_roles')
  .select('*')
  .eq('user_id', '305cfd9e-c9f6-4731-8a5b-a3147ea7b69e')
  .maybeSingle()

console.log('Select by user_id result:', byId, byIdError)
