using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Linq;
using System.Net.Http;
using Newtonsoft.Json;
using System.IO;

namespace TransactionAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TransactionController : ControllerBase
    {
        private static readonly HttpClient client = new HttpClient();

        [HttpPost]
        public async Task<IActionResult> SubmitTransaction([FromBody] TransactionRequest request)
        {
            // Sample implementation: Process each GUID with its corresponding HTTP requests
            var results = new List<TransactionResult>();

            foreach (var guid in request.Guids)
            {
                var transactionStatus = true;
                foreach (var httpRequest in request.HttpRequests)
                {
                    try
                    {
                        var httpRequestMessage = new HttpRequestMessage(new HttpMethod(httpRequest.Method), httpRequest.Url)
                        {
                            Content = new StringContent(httpRequest.Body ?? "")
                        };

                        var response = await client.SendAsync(httpRequestMessage);
                        if (!response.IsSuccessStatusCode)
                        {
                            transactionStatus = false;
                            break;
                        }
                    }
                    catch
                    {
                        transactionStatus = false;
                        break;
                    }
                }

                results.Add(new TransactionResult
                {
                    Guid = guid,
                    Status = transactionStatus
                });
            }

            // Generate a CSV file
            var csvFilePath = GenerateCsv(results);

            return Ok(new { fileUrl = csvFilePath });
        }

        private string GenerateCsv(List<TransactionResult> results)
        {
            var csvPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "transaction_report.csv");
            using (var writer = new StreamWriter(csvPath))
            {
                writer.WriteLine("GUID,Status");
                foreach (var result in results)
                {
                    writer.WriteLine($"{result.Guid},{result.Status}");
                }
            }

            return "/transaction_report.csv";
        }
    }

    public class TransactionRequest
    {
        public List<string> Guids { get; set; }
        public List<HttpRequestDetails> HttpRequests { get; set; }
    }

    public class HttpRequestDetails
    {
        public string Method { get; set; }
        public string Url { get; set; }
        public string Body { get; set; }
    }

    public class TransactionResult
    {
        public string Guid { get; set; }
        public bool Status { get; set; }
    }
}
