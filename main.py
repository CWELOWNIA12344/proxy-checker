import asyncio
import httpx
import time
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

app = FastAPI(title="Proxy Checker API", version="1.0.0")


class ProxyCheckRequest(BaseModel):
    """Request model for proxy checking"""
    proxies: List[str]
    timeout: Optional[int] = 10


class ProxyResult(BaseModel):
    """Response model for proxy check result"""
    proxy: str
    status: str
    response_time: Optional[float] = None
    ip_address: Optional[str] = None
    error: Optional[str] = None


class ProxyCheckResponse(BaseModel):
    """Response model for proxy check endpoint"""
    timestamp: str
    total_proxies: int
    successful: int
    failed: int
    results: List[ProxyResult]


async def check_single_proxy(
    proxy: str, 
    timeout: int = 10
) -> ProxyResult:
    """
    Check a single proxy by making a request through it.
    Returns proxy status, response time, and IP address.
    """
    proxy_url = f"http://{proxy}" if "://" not in proxy else proxy
    
    try:
        start_time = time.time()
        
        async with httpx.AsyncClient(
            proxies=proxy_url,
            timeout=timeout,
            verify=False
        ) as client:
            response = await client.get(
                "https://httpbin.org/ip",
                follow_redirects=True
            )
        
        response_time = round(time.time() - start_time, 3)
        
        if response.status_code == 200:
            try:
                ip_data = response.json()
                ip_address = ip_data.get("origin", "Unknown")
            except:
                ip_address = "Unknown"
            
            return ProxyResult(
                proxy=proxy,
                status="working",
                response_time=response_time,
                ip_address=ip_address
            )
        else:
            return ProxyResult(
                proxy=proxy,
                status="failed",
                response_time=response_time,
                error=f"HTTP {response.status_code}"
            )
    
    except asyncio.TimeoutError:
        return ProxyResult(
            proxy=proxy,
            status="timeout",
            error="Request timeout"
        )
    
    except httpx.ProxyError as e:
        return ProxyResult(
            proxy=proxy,
            status="failed",
            error=f"Proxy error: {str(e)}"
        )
    
    except httpx.ConnectError as e:
        return ProxyResult(
            proxy=proxy,
            status="failed",
            error=f"Connection error: {str(e)}"
        )
    
    except Exception as e:
        return ProxyResult(
            proxy=proxy,
            status="failed",
            error=f"Error: {str(e)}"
        )


@app.get("/", tags=["Health"])
async def root():
    """Root endpoint - API health check"""
    return {
        "status": "running",
        "service": "Proxy Checker API",
        "version": "1.0.0",
        "endpoints": {
            "check_proxies": "POST /check-proxies",
            "health": "GET /health"
        }
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat()
    }


@app.post("/check-proxies", response_model=ProxyCheckResponse, tags=["Proxy"])
async def check_proxies(request: ProxyCheckRequest):
    """
    Check multiple proxies concurrently.
    
    Args:
        proxies: List of proxies to check (format: "ip:port" or "http://ip:port")
        timeout: Timeout in seconds for each proxy check (default: 10)
    
    Returns:
        JSON with proxy check results including status, response time, and IP address
    """
    
    if not request.proxies:
        raise HTTPException(status_code=400, detail="Proxies list cannot be empty")
    
    if len(request.proxies) > 100:
        raise HTTPException(
            status_code=400, 
            detail="Maximum 100 proxies per request"
        )
    
    # Check all proxies concurrently
    tasks = [
        check_single_proxy(proxy, request.timeout) 
        for proxy in request.proxies
    ]
    results = await asyncio.gather(*tasks)
    
    # Calculate statistics
    successful = sum(1 for r in results if r.status == "working")
    failed = len(results) - successful
    
    return ProxyCheckResponse(
        timestamp=datetime.utcnow().isoformat(),
        total_proxies=len(results),
        successful=successful,
        failed=failed,
        results=results
    )


@app.post("/check-proxy", response_model=ProxyResult, tags=["Proxy"])
async def check_single_proxy_endpoint(
    proxy: str,
    timeout: Optional[int] = 10
):
    """
    Check a single proxy.
    
    Args:
        proxy: Proxy to check (format: "ip:port" or "http://ip:port")
        timeout: Timeout in seconds (default: 10)
    
    Returns:
        JSON with proxy status, response time, and IP address
    """
    
    if not proxy:
        raise HTTPException(status_code=400, detail="Proxy cannot be empty")
    
    result = await check_single_proxy(proxy, timeout)
    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
