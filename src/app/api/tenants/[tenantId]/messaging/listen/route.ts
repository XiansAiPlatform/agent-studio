import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    // Authenticate the user
    const session = await getServerSession(authOptions);
    if (!session) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const { tenantId } = await params;
    const { searchParams } = new URL(request.url);
    
    const agentName = searchParams.get('agentName');
    const activationName = searchParams.get('activationName');
    const participantId = searchParams.get('participantId') || session.user.email || '';
    const heartbeatSeconds = searchParams.get('heartbeatSeconds') || '60';

    // Validate required parameters
    if (!agentName) {
      return new Response(
        JSON.stringify({ error: 'agentName is required' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (!activationName) {
      return new Response(
        JSON.stringify({ error: 'activationName is required' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Build the Xians API URL
    const xiansBaseUrl = process.env.XIANS_SERVER_URL?.replace(/\/$/, '');
    const xiansApiKey = process.env.XIANS_APIKEY;

    if (!xiansBaseUrl || !xiansApiKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const queryParams = new URLSearchParams({
      agentName,
      activationName,
      participantId,
      heartbeatSeconds,
    });

    const xiansUrl = `${xiansBaseUrl}/api/v1/admin/tenants/${tenantId}/messaging/listen?${queryParams.toString()}`;

    // Create a fetch request to the Xians server with SSE
    const xiansResponse = await fetch(xiansUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${xiansApiKey}`,
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

    if (!xiansResponse.ok) {
      console.error('[SSE Listen] Xians API error:', xiansResponse.status, xiansResponse.statusText);
      return new Response(
        JSON.stringify({ 
          error: `Failed to connect to message stream: ${xiansResponse.statusText}` 
        }),
        { 
          status: xiansResponse.status,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if the response body exists
    if (!xiansResponse.body) {
      return new Response(
        JSON.stringify({ error: 'No response body from server' }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Create a ReadableStream to proxy the SSE data
    const stream = new ReadableStream({
      async start(controller) {
        const reader = xiansResponse.body!.getReader();
        let isClosed = false;

        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              if (!isClosed) {
                controller.close();
                isClosed = true;
              }
              break;
            }

            // Forward chunks to client
            try {
              controller.enqueue(value);
            } catch (enqueueError) {
              // Client disconnected
              isClosed = true;
              break;
            }
          }
        } catch (error) {
          console.error('[SSE] Stream error:', error);
          if (!isClosed) {
            try {
              controller.error(error);
            } catch {
              // Controller already closed
            }
            isClosed = true;
          }
        } finally {
          reader.releaseLock();
        }
      },
      cancel() {
        // Client cancelled the stream - silent cleanup
      },
    });

    // Return the SSE stream
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      },
    });
  } catch (error) {
    console.error('[SSE Listen] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
