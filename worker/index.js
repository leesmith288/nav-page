// Cloudflare Worker with D1 database storage for navigation tiles

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Default tiles for new users
const defaultTiles = [
  { id: '1', name: 'Google', url: 'https://google.com', color: '#4285F4' },
  { id: '2', name: '百度', url: 'https://baidu.com', color: '#2319dc' },
  { id: '3', name: 'GitHub', url: 'https://github.com', color: '#24292e' },
  { id: '4', name: 'ChatGPT', url: 'https://chat.openai.com', color: '#10A37F' },
];

export default {
  async fetch(request, env) {
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // One-time migration endpoint
    if (path === '/api/migrate' && request.method === 'POST') {
      return await migrateKVtoD1(env);
    }

    // Route handling
    if (path === '/api/tiles') {
      switch (request.method) {
        case 'GET':
          return await getTiles(env);
        case 'PUT':
          return await updateTiles(request, env);
        default:
          return new Response('Method not allowed', { 
            status: 405,
            headers: corsHeaders 
          });
      }
    }

    // Handle individual tile operations
    const tileMatch = path.match(/^\/api\/tiles\/(.+)$/);
    if (tileMatch) {
      const tileId = tileMatch[1];
      switch (request.method) {
        case 'POST':
          return await updateTile(request, env, tileId);
        case 'DELETE':
          return await deleteTile(env, tileId);
        default:
          return new Response('Method not allowed', { 
            status: 405,
            headers: corsHeaders 
          });
      }
    }

    return new Response('Not found', { 
      status: 404,
      headers: corsHeaders 
    });
  }
};

// Get all tiles from D1
async function getTiles(env) {
  try {
    const result = await env.DB.prepare('SELECT data FROM tiles WHERE id = 1').first();
    const tiles = result && result.data ? JSON.parse(result.data) : defaultTiles;
    
    return new Response(JSON.stringify({ tiles }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('Error getting tiles:', error);
    return new Response(JSON.stringify({ error: 'Failed to get tiles' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

// Update all tiles in D1
async function updateTiles(request, env) {
  try {
    const body = await request.json();
    const { tiles } = body;
    
    if (!Array.isArray(tiles)) {
      return new Response(JSON.stringify({ error: 'Invalid tiles format' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    await env.DB.prepare('UPDATE tiles SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1')
      .bind(JSON.stringify(tiles))
      .run();
    
    return new Response(JSON.stringify({ success: true, tiles }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('Error updating tiles:', error);
    return new Response(JSON.stringify({ error: 'Failed to update tiles' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

// Update single tile
async function updateTile(request, env, tileId) {
  try {
    const body = await request.json();
    
    const result = await env.DB.prepare('SELECT data FROM tiles WHERE id = 1').first();
    let tiles = result && result.data ? JSON.parse(result.data) : defaultTiles;
    
    const index = tiles.findIndex(t => t.id === tileId);
    if (index === -1) {
      tiles.push({ id: tileId, ...body });
    } else {
      tiles[index] = { id: tileId, ...body };
    }
    
    await env.DB.prepare('UPDATE tiles SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1')
      .bind(JSON.stringify(tiles))
      .run();
    
    return new Response(JSON.stringify({ success: true, tiles }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('Error updating tile:', error);
    return new Response(JSON.stringify({ error: 'Failed to update tile' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

// Delete tile
async function deleteTile(env, tileId) {
  try {
    const result = await env.DB.prepare('SELECT data FROM tiles WHERE id = 1').first();
    let tiles = result && result.data ? JSON.parse(result.data) : defaultTiles;
    
    const filteredTiles = tiles.filter(t => t.id !== tileId);
    
    if (filteredTiles.length === tiles.length) {
      return new Response(JSON.stringify({ error: 'Tile not found' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    await env.DB.prepare('UPDATE tiles SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1')
      .bind(JSON.stringify(filteredTiles))
      .run();
    
    return new Response(JSON.stringify({ success: true, tiles: filteredTiles }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('Error deleting tile:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete tile' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

// One-time migration from KV to D1
async function migrateKVtoD1(env) {
  try {
    const kvData = await env.NAV_TILES.get('tiles');
    if (!kvData) {
      return new Response(JSON.stringify({ error: 'No data in KV to migrate' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    const tiles = JSON.parse(kvData);
    
    await env.DB.prepare('UPDATE tiles SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1')
      .bind(JSON.stringify(tiles))
      .run();
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Migration completed! You can now remove KV from wrangler.toml',
      migratedTiles: tiles.length 
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('Migration error:', error);
    return new Response(JSON.stringify({ error: 'Migration failed', details: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}
