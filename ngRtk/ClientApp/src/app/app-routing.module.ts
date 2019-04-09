import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { RtkComponent } from './rtk/rtk.component';

const routes: Routes = [{ path: "", component: RtkComponent }];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
