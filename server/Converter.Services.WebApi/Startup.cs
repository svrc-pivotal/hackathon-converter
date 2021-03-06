﻿using System;

using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

using Google.Cloud.PubSub.V1;
using Converter.Services.TaskRunner;

using Converter.Services.Data;
using Converter.Services.Data.Maps;
using Microsoft.EntityFrameworkCore;

namespace Converter.Services.WebApi
{
    public class Startup
    {
        public Startup(IHostingEnvironment env)
        {
            var builder = new ConfigurationBuilder()
                .SetBasePath(env.ContentRootPath)
                .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
                .AddJsonFile($"appsettings.{env.EnvironmentName}.json", optional: true)
                .AddEnvironmentVariables();
            Configuration = builder.Build();
            this._env = env;
        }
        private const string ANALYSIS_TOPIC_NAME = "ConverterAnalysis";
        public IConfigurationRoot Configuration { get; }
        private readonly IHostingEnvironment _env;

        // This method gets called by the runtime. Use this method to add services to the container.
        public void ConfigureServices(IServiceCollection services)
        {
            MappingConfig.RegisterMaps();

            // Add framework services.
            services.AddMvc();
            services.AddAnalysisRepository(options =>
            {
                // TODO: configure database options (like connection string)
                options.UseMySql(Configuration["AnalysisConnectionString"]);
            });

            //services.AddScoped<ExcelAnalyzer>();
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app, IHostingEnvironment env, ILoggerFactory loggerFactory)
        {
            loggerFactory.AddConsole(Configuration.GetSection("Logging"));
            loggerFactory.AddDebug();

            app.UseDefaultFiles();
            app.UseStaticFiles();

            app.UseCors(options =>
            {
                options.AllowAnyOrigin();
                options.AllowAnyMethod();
                options.AllowAnyHeader();
            });


            app.UseMvc(routes =>
            {
                routes.MapRoute("default", "{controller}/{action}");
                routes.MapRoute("Spa", "{*url}", defaults: new { controller = "Home", action = "Spa" });
            });


        }
    }
}
