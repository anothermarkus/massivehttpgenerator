import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  private apiUrl = 'http://localhost:5000/api/transaction'; // .NET backend API endpoint

  constructor(private http: HttpClient) {}

  submitTransaction(transactionData: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, transactionData);
  }
}
