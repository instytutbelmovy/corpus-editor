using System.Net;
using System.Reflection;
using FluentValidation;

namespace Editor;

public static class ValidationExtensions
{
    public static IServiceCollection AddValidatorsFromAssemblyContaining<T>(this IServiceCollection serviceCollection)
    {
        var baseInterface = typeof(IValidator);
        var openGenericType = typeof(IValidator<>);
        foreach (var type in typeof(T).Assembly.GetTypes().Where(x => x.IsAssignableTo(baseInterface)))
        {
            var genericInterface = type.GetInterfaces().FirstOrDefault(i => i.IsGenericType && i.GetGenericTypeDefinition() == openGenericType);
            if (genericInterface != null)
                serviceCollection.AddSingleton(genericInterface, type);
        }

        return serviceCollection;
    }

    public static RouteHandlerBuilder Validate<TModel>(this RouteHandlerBuilder builder)
        where TModel : class
    {
        var validatorFilter = new ValidatorFilter<TModel>();
        return builder
            .AddEndpointFilter(validatorFilter)
            .WithMetadata(validatorFilter);
    }

    public static void CheckValidators(this IServiceProvider serviceProvider)
    {
        var endpointDataSource = serviceProvider.GetRequiredService<EndpointDataSource>();

        foreach (var endpoint in endpointDataSource.Endpoints)
        {
            if (endpoint is RouteEndpoint routeEndpoint)
            {
                foreach (var metadata in routeEndpoint.Metadata)
                {
                    var metadataType = metadata.GetType();
                    if (metadataType.IsAssignableTo(typeof(ValidatorFilter)))
                    {
                        var modelType = metadataType.GetGenericArguments()[0];
                        var handler = (MethodInfo)routeEndpoint.Metadata[0];
                        var parameters = handler.GetParameters();
                        var parameterFound = false;
                        for (int i = 0; i < parameters.Length; i++)
                        {
                            var parameter = parameters[i];
                            if (parameter.ParameterType == modelType)
                            {
                                ((ValidatorFilter)metadata).ArgumentIndex = i;
                                parameterFound = true;
                                break;
                            }
                        }
                        if (!parameterFound)
                        {
                            throw new InvalidOperationException($"No parameter of type {modelType.Name} found in handler for endpoint {routeEndpoint.RoutePattern.RawText}");
                        }
                    }
                }
            }
        }
    }

    private abstract class ValidatorFilter
    {
        public int ArgumentIndex { get; set; } = -1;
    }

    private class ValidatorFilter<TModel> : ValidatorFilter, IEndpointFilter
        where TModel : class
    {
        public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
        {
            var argument = (TModel?)context.Arguments[ArgumentIndex];
            if (argument == null)
                return Results.BadRequest(new ErrorResponse((int)HttpStatusCode.BadRequest, "Request object missing"));
            var validator = context.HttpContext.RequestServices.GetRequiredService<IValidator<TModel>>();
            // ReSharper disable once MethodHasAsyncOverload I won't have any async validators
            var validationResult = validator.Validate(argument);
            if (!validationResult.IsValid)
            {
                var errors = validationResult.Errors
                    .Select(e => new { e.PropertyName, e.ErrorMessage })
                    .ToList();
                return Results.BadRequest(new ErrorResponse((int)HttpStatusCode.BadRequest, string.Join(';', validationResult.Errors.Select(x => $"{x.PropertyName}: {x.ErrorMessage}"))));
            }

            return await next(context);
        }
    }
}