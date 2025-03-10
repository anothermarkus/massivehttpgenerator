import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class TransactionService {
  private apiUrl = 'http://localhost:5147/api/transaction'; // .NET backend API endpoint

  constructor(private http: HttpClient) {}

  submitGuidTransaction(guid: string, requestData: any): Observable<any> {
    // Assuming you send the GUID along with the requestData
    return this.http.post<any>(`${this.apiUrl}/${guid}`, requestData);
  }
}
