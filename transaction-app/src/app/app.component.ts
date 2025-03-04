import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { TransactionService } from './transaction.service'; // Assuming you have a service for API calls
import * as Papa from 'papaparse'; // Import PapaParse for CSV parsing

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
      body: ['']
    });
  }

  addHttpRequest() {
    this.requests.push(this.createHttpRequest());
  }

  // Method to handle CSV file upload and parse the GUIDs
  onFileChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      Papa.parse(file, {
        complete: (result) => {
          // Explicitly type `result.data` as `any[]`
          const parsedData: any[] = result.data as any[];

          // Assuming the GUIDs are in the first column of the CSV
          this.guidList = parsedData.map((row: any[]) => row[0]);
        },
        skipEmptyLines: true, // Ignore empty lines in the CSV
      });
    }
  }

  // Method to handle form submission and send the data to the API
  onSubmit() {
    if (this.transactionForm.valid && this.guidList.length > 0) {
      const transactionData = {
        guids: this.guidList,
        requests: this.transactionForm.value.httpRequests
      };

      this.transactionService.submitTransaction(transactionData).subscribe(
        (response: any) => {
          // Assuming the response contains a file URL for the CSV download
          this.downloadLink = response.fileUrl;
        },
        (error) => {
          console.error('Transaction submission failed:', error);
        }
      );
    }
  }

  // Method to download the result CSV file
  downloadCSV() {
    if (this.downloadLink) {
      window.open(this.downloadLink, '_blank');
    }
  }
}
