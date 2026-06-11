import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector  : 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './sidebar.html',
  styleUrls  : ['./sidebar.css']
})
export class SidebarComponent implements OnInit {
  @Input() activePage: string = '';

  userName      = '';
  userEmail     = '';
  userInitials  = '';
  isAdmin       = false;
  nombreAlertes = 0;
  alertesStock  : any[] = [];
  apiUrl = environment.apiUrl;

  constructor(
    private router : Router,
    private http   : HttpClient
  ) {}

  ngOnInit() {
    this.isAdmin = localStorage.getItem('user_role') === 'admin';
    this.loadUserInfo();
    this.loadAlertesStock();
  }

  loadUserInfo(): void {
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const payload     = JSON.parse(atob(token.split('.')[1]));
        this.userName     = payload.username || 'Utilisateur';
        this.userEmail    = payload.email    || '';
        this.userInitials = this.userName.substring(0, 2).toUpperCase();
      } catch {
        this.userName     = 'Utilisateur';
        this.userInitials = 'US';
      }
    }
    this.http.get<any>(`${this.apiUrl}/auth/profile/`).subscribe({
      next: (data) => {
        this.userName     = data.username || this.userName;
        this.userEmail    = data.email    || this.userEmail;
        this.userInitials = this.userName.substring(0, 2).toUpperCase();
      },
      error: () => {}
    });
  }

  loadAlertesStock(): void {
    this.http.get<any>(`${this.apiUrl}/produits/stock_faible/`).subscribe({
      next: (data) => {
        const liste = data.results || data;
        this.alertesStock = liste;
        this.nombreAlertes = this.alertesStock.length;
      },
      error: (err) => {
        console.error('Erreur chargement alertes:', err);
        this.nombreAlertes = 0;
      }
    });
  }

  openAlertesStock(): void {
    this.router.navigate(['/produits']);
  }

  navigateTo(page: string) {
    this.router.navigate([`/${page}`]);
  }

  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_role');
    this.router.navigate(['/auth/login']);
  }
}