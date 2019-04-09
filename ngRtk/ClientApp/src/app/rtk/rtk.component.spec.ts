import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RtkComponent } from './rtk.component';

describe('RtkComponent', () => {
  let component: RtkComponent;
  let fixture: ComponentFixture<RtkComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RtkComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RtkComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
