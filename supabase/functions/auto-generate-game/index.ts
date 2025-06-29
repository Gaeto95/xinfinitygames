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
    
    // PROACTIVELY update next generation time FIRST to prevent hanging
    const nextAutoGeneration = new Date(Date.now() + 3 * 60 * 60 * 1000) // 3 hours from now
    
    console.log('Proactively updating next generation time to prevent hanging...')
    const proactiveUpdateResponse = await fetch(`${supabaseUrl}/rest/v1/generation_stats`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        next_auto_generation: nextAutoGeneration.toISOString(),
        updated_at: new Date().toISOString()
      })
    })
    
    if (!proactiveUpdateResponse.ok) {
      console.error('Failed to proactively update generation time:', await proactiveUpdateResponse.text())
    } else {
      console.log('Successfully updated next generation time to:', nextAutoGeneration.toISOString())
    }
    
    // Check if it's time for auto-generation
    const statsResponse = await fetch(`${supabaseUrl}/rest/v1/generation_stats?select=*&limit=1`, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
      }
    })
    
    if (!statsResponse.ok) {
      console.error('Failed to fetch generation stats:', await statsResponse.text())
      throw new Error('Failed to fetch generation stats')
    }
    
    const statsData = await statsResponse.json()
    const stats = statsData[0]
    
    if (!stats) {
      console.error('No generation stats found in database')
      throw new Error('No generation stats found')
    }
    
    const now = new Date()
    const nextGeneration = new Date(stats.next_auto_generation)
    
    console.log('Time check:', {
      currentTime: now.toISOString(),
      nextScheduled: nextGeneration.toISOString(),
      shouldGenerate: now >= nextGeneration
    })
    
    if (now < nextGeneration) {
      const timeRemaining = Math.ceil((nextGeneration.getTime() - now.getTime()) / 1000)
      console.log(`Not time for auto-generation yet. ${timeRemaining} seconds remaining.`)
      
      return new Response(
        JSON.stringify({ 
          message: 'Not time for auto-generation yet',
          nextGeneration: nextGeneration.toISOString(),
          timeRemaining: timeRemaining,
          currentTime: now.toISOString()
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }
    
    console.log('Time for auto-generation! Calling main generation function...')
    
    // Call the main generate-game function with auto-generation flag
    const generateResponse = await fetch(`${supabaseUrl}/functions/v1/generate-game`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        auto_generated: true,
        user_prompt: '' // Empty prompt for random generation
      })
    })
    
    if (!generateResponse.ok) {
      const errorText = await generateResponse.text()
      console.error('Game generation failed:', errorText)
      throw new Error(`Game generation failed: ${errorText}`)
    }
    
    const gameResult = await generateResponse.json()
    console.log('Auto-generated game successfully:', {
      title: gameResult.title,
      success: gameResult.success
    })
    
    // Update the last generation time and confirm next generation time
    console.log('Updating generation stats with completion time...')
    const finalUpdateResponse = await fetch(`${supabaseUrl}/rest/v1/generation_stats?id=eq.${stats.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        last_auto_generation: now.toISOString(),
        next_auto_generation: nextAutoGeneration.toISOString(), // Confirm the time we set earlier
        updated_at: now.toISOString()
      })
    })
    
    if (!finalUpdateResponse.ok) {
      const updateError = await finalUpdateResponse.text()
      console.error('Failed to update final stats:', updateError)
      // Don't throw here - game was generated successfully
    } else {
      console.log('Generation stats updated successfully')
    }
    
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Auto-generated game successfully',
        game: gameResult,
        nextGeneration: nextAutoGeneration.toISOString(),
        currentTime: now.toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
    
  } catch (error) {
    console.error('Auto-generation error:', error)
    
    // Try to set retry time even if generation failed (30 minutes for quicker retry)
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const retryTime = new Date(Date.now() + 30 * 60 * 1000) // Retry in 30 minutes on error
      
      console.log('Setting retry time for 30 minutes due to error...')
      await fetch(`${supabaseUrl}/rest/v1/generation_stats`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          next_auto_generation: retryTime.toISOString(),
          updated_at: new Date().toISOString()
        })
      })
      
      console.log('Set retry time for 30 minutes due to error')
    } catch (retryError) {
      console.error('Failed to set retry time:', retryError)
    }
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        retryIn: '30 minutes'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})