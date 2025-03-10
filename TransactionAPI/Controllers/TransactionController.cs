using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Linq;
using System.Net.Http;
using Newtonsoft.Json;
using System.Text.RegularExpressions;

namespace TransactionAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TransactionController : ControllerBase
    {
        private static readonly HttpClient client = new HttpClient();
        private static readonly Dictionary<string, Dictionary<string, object>> OutputVariables = new Dictionary<string, Dictionary<string, object>>();

        [HttpPost("{guid}")]
        public async Task<IActionResult> SubmitTransaction(string guid, [FromBody] List<HttpRequestDetails> httpRequests)
        {
            // Store the GUID's output variable mapping
            if (!OutputVariables.ContainsKey(guid))
                OutputVariables[guid] = new Dictionary<string, object>();

            foreach (var httpRequest in httpRequests)
            {
                // Replace output variable placeholders in URL, headers, and body
                httpRequest.Url = SubstituteVariables(httpRequest.Url, guid);
                httpRequest.Body = SubstituteVariables(httpRequest.Body, guid);
                httpRequest.Headers = SubstituteVariables(httpRequest.Headers, guid);

                try
                {
                    // Create HTTP request message
                    var requestMessage = new HttpRequestMessage(new HttpMethod(httpRequest.Method), httpRequest.Url)
                    {
                        Content = new StringContent(httpRequest.Body ?? "")
                    };

                    // Add headers if any
                    if (!string.IsNullOrEmpty(httpRequest.Headers))
                    {
                        var headers = JsonConvert.DeserializeObject<Dictionary<string, string>>(httpRequest.Headers);
                        foreach (var header in headers)
                        {
                            requestMessage.Headers.Add(header.Key, header.Value);
                        }
                    }

                    // Send the request
                    var response = await client.SendAsync(requestMessage);

                    // Check if the response is unsuccessful
                    if (!response.IsSuccessStatusCode)
                    {
                        var errorMessage = $"Request failed with status code: {response.StatusCode}.";
                        var errorDetails = await response.Content.ReadAsStringAsync();
                        return StatusCode(500, new { message = errorMessage, details = errorDetails });
                    }

                    // Process the response to capture the output variable
                    var responseContent = await response.Content.ReadAsStringAsync();
                    var outputVariableValue = GetJsonValue(responseContent, httpRequest.OutputVariable);

                    // Save the output variable value for future substitutions
                    if (outputVariableValue != null)
                    {
                        OutputVariables[guid][httpRequest.OutputVariableName] = outputVariableValue;
                    }
                }
                catch (Exception ex)
                {
                    // Return HTTP 500 with the exception message if the request fails
                    return StatusCode(500, new { message = "Request failed due to an exception.", error = ex.Message });
                }
            }

            // If all requests succeed, return an OK response
            return Ok(new { message = "Transaction completed successfully" });
        }

        private string SubstituteVariables(string input, string guid)
        {
            // Substitute any placeholder in the format {TOKEN} with actual values from the output variables
            if (string.IsNullOrEmpty(input)) return input;

            var pattern = new Regex(@"{(.*?)}");
            var matches = pattern.Matches(input);

            foreach (Match match in matches)
            {
                var variableName = match.Groups[1].Value;
                if (OutputVariables.ContainsKey(guid) && OutputVariables[guid].ContainsKey(variableName))
                {
                    var replacement = OutputVariables[guid][variableName].ToString();
                    input = input.Replace(match.Value, replacement);
                }
            }

            return input;
        }

        private object GetJsonValue(string json, string jsonPath)
        {
            // Use JsonPath to extract the value
            var token = JsonConvert.DeserializeObject<dynamic>(json);
            var pathParts = jsonPath.Split('.');

            foreach (var part in pathParts)
            {
                if (token[part] != null)
                {
                    token = token[part];
                }
                else
                {
                    return null;
                }
            }

            return token.ToString();
        }
    }

    public class HttpRequestDetails
    {
        public string Method { get; set; }
        public string Url { get; set; }
        public string Headers { get; set; } // Headers in JSON string format
        public string Body { get; set; }
        public string OutputVariable { get; set; }  // The JSON path to the value
        public string OutputVariableName { get; set; } // The name to use for substitution
    }
}
