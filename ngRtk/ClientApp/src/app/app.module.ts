import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { RtkComponent } from './rtk/rtk.component';

import { AngularPhoneticModule } from 'angular-phonetic';

@NgModule({
  declarations: [
    AppComponent,
    RtkComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    AngularPhoneticModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
