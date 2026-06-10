import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Chart, registerables } from 'chart.js';
import { DarkModeService } from '../shared/dark-mode';
import { SidebarComponent } from '../shared/sidebar/sidebar';
import { environment } from '../../environments/environment';

Chart.register(...registerables);

interface StatsDashboard {
  chiffre_affaires  : number;
  total_ventes      : number;
  produits_en_stock : number;
  benefices         : number;
}

interface VenteRecente {
  id            : number;
  client_nom    : string;
  montant_total : number;
  statut        : string;
  date_vente    : string;
}

interface AlerteStock {
  id             : number;
  nom            : string;
  quantite_stock : number;
  seuil_alerte   : number;
  pourcentage    : number;
}

@Component({
  selector    : 'app-dashboard',
  standalone  : true,
   imports     : [CommonModule, SidebarComponent],
  templateUrl : './dashboard.html',
  styleUrls   : ['./dashboard.css']
})
export class DashboardComponent implements OnInit, AfterViewInit {

  @ViewChild('caChart')  caChartRef!  : ElementRef;
  @ViewChild('catChart') catChartRef! : ElementRef;

  userName      = '';
  userEmail     = '';
  userInitials  = '';
  currentDate   = '';
  isDark        = false;
  isLoading     = true;
  nombreAlertes = 0;
  searchTerm    = '';

  stats: StatsDashboard = {
    chiffre_affaires  : 0,
    total_ventes      : 0,
    produits_en_stock : 0,
    benefices         : 0,
  };

  dernieresVentes : VenteRecente[] = [];
  alertesStock    : AlerteStock[]  = [];
  categories      : any[]          = [];
  ventes          : any[]          = [];

  private caChart  : Chart | null = null;
  private catChart : Chart | null = null;
  private apiUrl = 'environment.apiUrl;';


  constructor(
    private router          : Router,
    private http            : HttpClient,
    private darkModeService : DarkModeService,
  ) {}

  ngOnInit(): void {
    this.setDate();
    this.loadUserInfo();
    this.isDark = this.darkModeService.getDarkMode();
    this.loadStats();
    this.loadDernieresVentes();
    this.loadAlertesStock();
    this.loadCategories();
  }

  ngAfterViewInit(): void {
  setTimeout(() => {
    this.initCaChart();
    this.initCatChart();
  }, 1000);
}

  toggleDark(): void {
    this.darkModeService.toggleDark();
    this.isDark = this.darkModeService.getDarkMode();
  }

  setDate(): void {
    const jours = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
    const mois  = ['janvier','février','mars','avril','mai','juin',
                   'juillet','août','septembre','octobre','novembre','décembre'];
    const now   = new Date();
    this.currentDate = `${jours[now.getDay()]} ${now.getDate()} ${mois[now.getMonth()]} ${now.getFullYear()}`;
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

  loadStats(): void {
    this.http.get<any>(`${this.apiUrl}/ventes/statistiques/`).subscribe({
      next: (data) => {
        this.stats.chiffre_affaires = data.chiffre_affaires || 0;
        this.stats.total_ventes     = data.total_ventes     || 0;
      }
    });
    this.http.get<any>(`${this.apiUrl}/produits/statistiques/`).subscribe({
      next: (data) => {
        this.stats.produits_en_stock = data.total_produits || 0;
        this.stats.benefices         = data.valeur_stock   || 0;
      }
    });
  }
derniersProduitsVendus : any[] = [];  // ← supprime cette ligne

loadDernieresVentes(): void {
  this.http.get<any>(`${this.apiUrl}/ventes/`).subscribe({
    next: (data) => {
      const liste = data.results || data;
      this.ventes = liste;
      this.dernieresVentes = liste.slice(0, 5).map((v: any) => ({
        id            : v.id,
        client_nom    : v.client_nom || 'Client anonyme',
        montant_total : v.montant_total,
        statut        : v.statut,
        date_vente    : v.date_vente,
      }));
      this.isLoading = false;
    },
    error: () => { this.isLoading = false; }
  });
}

  loadAlertesStock(): void {
    this.http.get<any>(`${this.apiUrl}/produits/stock_faible/`).subscribe({
      next: (data) => {
        const liste = data.results || data;
        this.alertesStock = liste.map((p: any) => ({
          id             : p.id,
          nom            : p.nom,
          quantite_stock : p.quantite_stock,
          seuil_alerte   : p.seuil_alerte,
          pourcentage    : Math.round((p.quantite_stock / (p.seuil_alerte * 2)) * 100),
        }));
        this.nombreAlertes = this.alertesStock.length;
      }
    });
  }

 loadCategories(): void {
  this.http.get<any>(`${this.apiUrl}/categories/`).subscribe({
    next: (data) => {
      this.categories = data.results || data;
    }
  });
}
  initCharts(): void { this.initCaChart(); }

  initCaChart(): void {
    if (!this.caChartRef) return;
    if (this.caChart) { this.caChart.destroy(); }

    const now    = new Date();
    const labels : string[] = [];
    const jours  = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      labels.push(jours[d.getDay()]);
    }

    const data = labels.map((_, idx) => {
      const d = new Date(now);
      d.setDate(now.getDate() - (6 - idx));
      const dateStr = d.toISOString().split('T')[0];
      return this.ventes
        .filter((v: any) => v.date_vente && v.date_vente.startsWith(dateStr))
        .reduce((sum: number, v: any) => sum + parseFloat(v.montant_total), 0);
    });

    this.caChart = new Chart(this.caChartRef.nativeElement, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label               : 'Chiffre d\'affaires',
          data,
          borderColor         : '#7c5cbf',
          backgroundColor     : 'rgba(124,92,191,0.1)',
          borderWidth         : 2.5,
          pointBackgroundColor: '#7c5cbf',
          pointRadius         : 4,
          tension             : 0.4,
          fill                : true,
        }]
      },
      options: {
        responsive         : true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#8b83b6', font: { size: 11 } } },
          y: { grid: { color: 'rgba(139,131,182,0.15)' }, ticks: { color: '#8b83b6', font: { size: 11 }, callback: (v: any) => v >= 1000 ? (v/1000) + 'k' : v } }
        }
      }
    });
  }

  initCatChart(): void {
    if (!this.catChartRef) return;
    if (this.catChart) { this.catChart.destroy(); }

    const labels = this.categories.length > 0 ? this.categories.map((c: any) => c.nom) : ['Alimentation', 'Hygiène', 'Boissons', 'Autres'];
    const data   = this.categories.length > 0 ? this.categories.map((c: any) => c.nombre_produits || 1) : [42, 28, 18, 12];

    this.catChart = new Chart(this.catChartRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{ data, backgroundColor: ['#4c35a0','#7c5cbf','#a78bfa','#c4b5fd','#ddd6fe'], borderWidth: 0, hoverOffset: 4 }]
      },
      options: {
        responsive         : true,
        maintainAspectRatio: false,
        cutout             : '65%',
        plugins: { legend: { position: 'bottom', labels: { color: '#8b83b6', font: { size: 11 }, padding: 12, boxWidth: 10 } } }
      }
    });
  }

  onSearch(event: any): void { this.searchTerm = event.target.value.toLowerCase(); }

  get ventesFiltrees(): VenteRecente[] {
    if (!this.searchTerm) return this.dernieresVentes;
    return this.dernieresVentes.filter(v => v.client_nom.toLowerCase().includes(this.searchTerm));
  }

  getProgressColor(pct: number): string {
    if (pct <= 20) return '#e24b4a';
    if (pct <= 40) return '#ba7517';
    return '#f59e0b';
  }

  getInitiales(nom: string): string {
    if (!nom) return '??';
    return nom.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
  }

  getBadgeClass(statut: string): string {
    switch (statut) {
      case 'payee'      : return 'badge-ok';
      case 'en_attente' : return 'badge-pend';
      case 'annulee'    : return 'badge-ann';
      default           : return 'badge-pend';
    }
  }

  getStatutLabel(statut: string): string {
    switch (statut) {
      case 'payee'      : return 'Payée';
      case 'en_attente' : return 'En attente';
      case 'annulee'    : return 'Annulée';
      default           : return statut;
    }
  }

  formatMontant(montant: number): string {
    return Number(montant).toLocaleString('fr-FR') + ' F';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now  = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return `Aujourd'hui, ${date.getHours()}h${String(date.getMinutes()).padStart(2, '0')}`;
    if (diff === 1) return `Hier, ${date.getHours()}h${String(date.getMinutes()).padStart(2, '0')}`;
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  }

  navigateTo(page: string): void { this.router.navigate(['/' + page]); }

  logout(): void {
    if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('stockmaster_dark');
      localStorage.removeItem('user_role');
      this.router.navigate(['/auth/login']);
    }
  }
}