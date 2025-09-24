import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/api";

export const LoginDebugTest = () => {
  const [result, setResult] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const testDirectFetch = async () => {
    setIsLoading(true);
    setResult("Testing direct fetch...\n");
    
    try {
      const response = await fetch('http://localhost:8000/api/auth/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'admin@xfactory.com',
          password: 'adminpass123'
        })
      });

      setResult(prev => prev + `Fetch Status: ${response.status}\n`);
      
      if (response.ok) {
        const data = await response.json();
        setResult(prev => prev + `SUCCESS: ${JSON.stringify(data, null, 2)}\n`);
      } else {
        const errorText = await response.text();
        setResult(prev => prev + `ERROR: ${errorText}\n`);
      }
    } catch (error) {
      setResult(prev => prev + `FETCH ERROR: ${error}\n`);
    }
    
    setIsLoading(false);
  };

  const testApiClient = async () => {
    setIsLoading(true);
    setResult("Testing apiClient...\n");
    
    try {
      const response = await apiClient.login('admin@xfactory.com', 'adminpass123');
      setResult(prev => prev + `ApiClient Status: ${response.status}\n`);
      
      if (response.data) {
        setResult(prev => prev + `SUCCESS: ${JSON.stringify(response.data, null, 2)}\n`);
      } else {
        setResult(prev => prev + `ERROR: ${response.error}\n`);
      }
    } catch (error) {
      setResult(prev => prev + `APICLIENT ERROR: ${error}\n`);
    }
    
    setIsLoading(false);
  };

  const testCORS = async () => {
    setIsLoading(true);
    setResult("Testing CORS preflight...\n");
    
    try {
      // First test a simple GET request
      const getResponse = await fetch('http://localhost:8000/api/auth/profile/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      setResult(prev => prev + `GET Status: ${getResponse.status}\n`);
      
      // Then test the POST request with CORS headers
      const postResponse = await fetch('http://localhost:8000/api/auth/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          email: 'admin@xfactory.com',
          password: 'adminpass123'
        })
      });
      
      setResult(prev => prev + `POST Status: ${postResponse.status}\n`);
      
      if (postResponse.ok) {
        const data = await postResponse.json();
        setResult(prev => prev + `CORS SUCCESS: Login worked\n`);
      } else {
        setResult(prev => prev + `CORS ERROR: ${postResponse.status}\n`);
      }
      
    } catch (error) {
      setResult(prev => prev + `CORS ERROR: ${error}\n`);
    }
    
    setIsLoading(false);
  };

  return (
    <Card className="max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>Login Debug Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={testDirectFetch} disabled={isLoading}>
            Test Direct Fetch
          </Button>
          <Button onClick={testApiClient} disabled={isLoading}>
            Test ApiClient
          </Button>
          <Button onClick={testCORS} disabled={isLoading}>
            Test CORS
          </Button>
        </div>
        
        <div className="bg-gray-100 p-4 rounded min-h-[200px] font-mono text-sm whitespace-pre-wrap">
          {result || "Click a button to test login..."}
        </div>
      </CardContent>
    </Card>
  );
}; 