import {
  Component,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs/Subscription';
import { GoogleApiService, GoogleAuthService } from 'ng-gapi';
import GoogleAuth = gapi.auth2.GoogleAuth;

import { IFile } from '../interfaces/report.interface';
import { IReportConfig, ReportConfig } from 'app/config/report.config';
import { ReportService } from 'app/sevices/report.service';
import { STORAGE_TOKEN_KEY } from 'app/config/app.config';

enum FlowState {
  INITIAL, TOKEN_READY, ANALYZE_DONE, REPORTS_DONE
}

@Component({
  selector: 'cv-summary',
  templateUrl: './summary.component.html',
  styleUrls: ['./summary.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})

export class SummaryComponent implements OnDestroy {

  fileList: IFile[];
  reportConfig: IReportConfig;
  fileId: string;
  routeSub: Subscription;
  authSub: Subscription;
  state: FlowState;
  processing: boolean;
  statusCheckTimer: any;

  constructor(private reportService: ReportService,
              private gapiService: GoogleApiService,
              private googleAuth: GoogleAuthService,
              private changeDetectorRef: ChangeDetectorRef,
              private route: ActivatedRoute) {

    this.reportConfig = new ReportConfig();
    this.state = FlowState.INITIAL;

    this.routeSub = this.route.params.subscribe(params => {
      const stateParam = this.route.snapshot.queryParams['state'];
      this.fileId = JSON.parse(stateParam).ids[0];
    });

    this.gapiService.onLoad(() => {
      this.authSub = this.googleAuth.getAuth().subscribe((auth) => this.getToken(auth));
    });

    this.statusCheckTimer = setInterval(() => {
      if (this.processing) {
        return;
      }
      if (this.state === FlowState.TOKEN_READY && this.fileId) {
        this.analyzeFile(localStorage.getItem(STORAGE_TOKEN_KEY));
      } else if (this.state === FlowState.ANALYZE_DONE) {
        this.getReports();
      } else if (this.state === FlowState.REPORTS_DONE) {
        clearInterval(this.statusCheckTimer);
      }
    }, 100);
  }

  ngOnDestroy(): void {
    this.routeSub.unsubscribe();
    this.authSub.unsubscribe();
  }

  getToken(auth: GoogleAuth): void {
    auth.signIn()
      .then(res => {
        localStorage.setItem(STORAGE_TOKEN_KEY, res.getAuthResponse().access_token);
        this.state = FlowState.TOKEN_READY;
      })
      .catch((err) => {
        console.log('getToken FAILED ' + err);
      });
  }

  analyzeFile(token: string): void {
    this.processing = true;
    this.reportService.analyzeFile(this.fileId)
      .subscribe(
        data => {},
        err => {
          console.log('getReports FAILED' + err);
        },
        () => {
          this.processing = false;
          this.state = FlowState.ANALYZE_DONE;
        }
      );
  }

  getReports(): void {
    this.processing = true;
    this.reportService.getReports()
      .subscribe(
        data => {
          this.fileList = data;
          this.changeDetectorRef.detectChanges();
        },
        err => {
          console.log('getReports FAILED' + err);
        },
        () => {
          this.state = FlowState.REPORTS_DONE;
          this.processing = false;
        }
      );
  }
}
