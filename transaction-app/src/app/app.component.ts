import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { TransactionService } from './transaction.service'; // Assuming you have a service for API calls
import * as Papa from 'papaparse'; // Import PapaParse for CSV parsing
import { from, of } from 'rxjs';
import { bufferCount, catchError, concatMap, map, mergeMap, switchMap, tap } from 'rxjs/operators';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: false
})
export class AppComponent implements OnInit {
  transactionForm!: FormGroup;
  guidList: string[] = [];
  downloadLink: string | null = null;
  requestProgress: string[] = []; // To track the progress (dots for each request)
  successfulCount = 0;
  failedCount = 0;

  constructor(private fb: FormBuilder, private transactionService: TransactionService) {}

  ngOnInit() {
    this.transactionForm = this.fb.group({
      httpRequests: this.fb.array([this.createHttpRequest()])
    });
  }

  get requests() {
    return this.transactionForm.get('httpRequests') as FormArray;
  }

  createHttpRequest() {
    return this.fb.group({
      method: ['', Validators.required],
      url: ['', Validators.required],
      headers: [''],
      body: [''],
      outputVariable: [''],  // Path to the output variable (e.g., data.user.id)
      outputVariableName: ['']  // Name for the output variable (e.g., extractedId)
    });
  }

  addHttpRequest() {
    this.requests.push(this.createHttpRequest());
  }

  removeHttpRequest() {
    const control = this.requests;
    if (control.length > 0) {
      control.removeAt(control.length - 1);
    }
  }

  // Method to handle CSV file upload and parse the GUIDs
  onFileChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      Papa.parse(file, {
        complete: (result) => {
          const rows: string[] = result.data[0] ? result.data[0] as string[] : [];
          rows.forEach(item => this.guidList.push(item));
        },
        skipEmptyLines: true, // Ignore empty lines in the CSV
      });
    }
  }

  onSubmit() {
    if (this.transactionForm.valid && this.guidList.length > 0) {
      const requestData = this.transactionForm.value.httpRequests;
      

     // Initialize the progress tracker with an empty array of dots
     this.requestProgress = Array(this.guidList.length).fill('.'); 


      // Use bufferCount to send requests in batches of X
      from(this.guidList)
        .pipe(
          bufferCount(10), // Adjust the number (e.g., 10) for batch size if needed
          mergeMap((guids) =>
            from(guids).pipe(
              // For each GUID, call the API and count success/failure
              mergeMap((guid, index) =>
                this.transactionService.submitGuidTransaction(guid, requestData).pipe(
                  map((response) => ({ success: true, guid, index })),
                  catchError((error) => {
                    console.error(`Error processing GUID ${guid}:`, error);
                    return of({ success: false, guid, index });
                  })
                )
              ),
              // Collect the results
              tap((result) => {
                if (result.success) {
                  this.successfulCount++;
                } else {
                  this.failedCount++;
                }

                   // Update progress with a dot (.) for each request
                   this.requestProgress[result.index] = '.';

              })
            )
          ),
          // Handle all responses and create CSV once completed
          switchMap(() =>
            of({ successfulCount: this.successfulCount, failedCount: this.failedCount }).pipe(
              tap(() => {
                this.generateCSV(this.successfulCount, this.failedCount);
              })
            )
          )
        )
        .subscribe({
          next: () => console.log('Transaction completed.'),
          error: (err) => console.error('Error in transaction submission:', err),
        });
    }
  }
  
    // Method to generate CSV data
    generateCSV(successfulCount: number, failedCount: number) {
      const csvData = [
        ['GUID', 'Status'],
        ['Success', successfulCount],
        ['Failure', failedCount],
      ];

      // Convert to CSV format
      const csvContent = csvData.map(row => row.join(',')).join('\n');

      // Trigger file download
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      this.downloadLink = url;

      // Optionally, automatically trigger download for the user
      const a = document.createElement('a');
      a.href = url;
      a.download = 'transaction_results.csv';
      a.click();
    }



  // Method to download the result CSV file
  downloadCSV() {
    if (this.downloadLink) {
      window.open(this.downloadLink, '_blank');
    }
  }

  // Helper method to process URL replacements and output extraction
  processHttpRequest(request: any) {
    // URL Processing: Replace URL segments with variables from GUID list
    let processedUrl = request.url;

    // Extract variable name from URL, like {guid}, and replace with corresponding value from guidList
    const urlMatch = processedUrl.match(/{(.*?)}/);
    if (urlMatch && urlMatch[1] && this.guidList.length > 0) {
      processedUrl = processedUrl.replace(`{${urlMatch[1]}}`, this.guidList[0]);
    }

    console.log(`Processed URL: ${processedUrl}`);

    // Handle output variable extraction
    if (request.outputVariable) {
      const response = {}; // The response would come from the API call
      const outputValue = this.extractOutputVariable(response, request.outputVariable);
      console.log(`Extracted output variable: ${outputValue}`);
    }
  }

  // Helper function to safely extract a variable from the response
  extractOutputVariable(response: any, path: string): any {
    return path.split('.').reduce((obj, key) => (obj && obj[key]) ? obj[key] : null, response);
  }
}
