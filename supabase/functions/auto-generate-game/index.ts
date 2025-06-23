const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    console.log('Auto-generation triggered at:', new Date().toISOString())
    
    // Check if it's time for auto-generation
    const statsResponse = await fetch(`${supabaseUrl}/rest/v1/generation_stats?select=*&limit=1`, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
      }
    })
    
    if (!statsResponse.ok) {
      throw new Error('Failed to fetch generation stats')
    }
    
    const statsData = await statsResponse.json()
    const stats = statsData[0]
    
    if (!stats) {
      throw new Error('No generation stats found')
    }
    
    const now = new Date()
    const nextGeneration = new Date(stats.next_auto_generation)
    
    console.log('Current time:', now.toISOString())
    console.log('Next scheduled generation:', nextGeneration.toISOString())
    
    if (now < nextGeneration) {
      return new Response(
        JSON.stringify({ 
          message: 'Not time for auto-generation yet',
          nextGeneration: nextGeneration.toISOString(),
          timeRemaining: Math.ceil((nextGeneration.getTime() - now.getTime()) / 1000)
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }
    
    // Call the main generate-game function
    console.log('Calling main generation function...')
    const generateResponse = await fetch(`${supabaseUrl}/functions/v1/generate-game`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ auto_generated: true })
    })
    
    if (!generateResponse.ok) {
      const errorText = await generateResponse.text()
      throw new Error(`Game generation failed: ${errorText}`)
    }
    
    const gameResult = await generateResponse.json()
    console.log('Auto-generated game:', gameResult.title)
    
    // Update statistics for auto-generation
    const updateStatsResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/update_generation_stats`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ is_auto_generation: true })
    })
    
    if (!updateStatsResponse.ok) {
      console.error('Failed to update stats, but game was generated successfully')
    }
    
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Auto-generated game successfully',
        game: gameResult,
        nextGeneration: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString() // 3 hours from now
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
    
  } catch (error) {
    console.error('Auto-generation error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})