import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { TransactionService } from '../transaction.service';
import { HttpClient } from '@angular/common/http';
import * as Papa from 'papaparse';

@Component({
  selector: 'app-upload-form',
  templateUrl: './upload-form.component.html',
  styleUrls: ['./upload-form.component.css'],
  standalone: false
})
export class UploadFormComponent implements OnInit {
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

  

  onFileChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      Papa.parse(file, {
        complete: (result) => {
          
          const parsedData: CsvRow[] = result.data as CsvRow[];

        // Assuming the first column contains the GUIDs
        this.guidList = parsedData.map(row => row.guid); // Accessing the 'guid' field

        }
      });
    }
  }

  onSubmit() {
    if (this.transactionForm.valid && this.guidList.length > 0) {
      const transactionData = {
        guids: this.guidList,
        requests: this.transactionForm.value.httpRequests
      };

      this.transactionService.submitTransaction(transactionData).subscribe((response: any) => {
        this.downloadLink = response.fileUrl;
      });
    }
  }

  downloadCSV() {
  if (this.downloadLink) {
    window.open(this.downloadLink, '_blank');
  } else {
    console.error('Download link is null or undefined');
  }
}
}

interface CsvRow {
  guid: string;
  // Add other fields if necessary
}
